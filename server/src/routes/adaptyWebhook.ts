import type { FastifyPluginAsync } from "fastify";
import { ZodError } from "zod";
import { config } from "../config.js";
import type { Environment } from "../env.js";
import {
  createAdaptyWebhookService,
  createDrizzleAdaptyWebhookRepository,
  type AdaptyWebhookService,
} from "../subscriptions/index.js";
import { verifyWebhookAuthorization } from "../webhooks/index.js";

interface AdaptyWebhookRouteDependencies {
  environment?: Environment;
  service?: AdaptyWebhookService;
}

function getService(
  dependencies: AdaptyWebhookRouteDependencies,
  environment: Environment,
): AdaptyWebhookService {
  return (
    dependencies.service ??
    createAdaptyWebhookService(createDrizzleAdaptyWebhookRepository(), undefined, environment.adaptyWebhookAcceptedStoreEnvironments)
  );
}

export function createAdaptyWebhookRoutes(
  dependencies: AdaptyWebhookRouteDependencies = {},
): FastifyPluginAsync {
  return async (app) => {
    app.post("/webhooks/adapty", async (request, reply) => {
      const environment = dependencies.environment ?? config;
      const expectedAuthorization = environment.adaptyWebhookAuth;
      if (!expectedAuthorization) {
        return reply.code(503).send({
          error: {
            code: "ADAPTY_WEBHOOK_NOT_CONFIGURED",
            message: "Adapty webhook is not configured",
          },
        });
      }

      const authorization = request.headers.authorization ?? "";
      if (
        !verifyWebhookAuthorization(authorization, expectedAuthorization)
      ) {
        return reply.code(401).send({
          error: {
            code: "WEBHOOK_VERIFICATION_FAILED",
            message: "Adapty webhook verification failed",
          },
        });
      }

      if (
        typeof request.body === "object" &&
        request.body !== null &&
        !Array.isArray(request.body) &&
        Object.keys(request.body).length === 0
      ) {
        return {};
      }

      try {
        const result = await getService(dependencies, environment).record(request.body);
        return { accepted: true, ...result };
      } catch (error) {
        if (error instanceof ZodError) {
          return reply.code(400).send({
            error: {
              code: "INVALID_ADAPTY_WEBHOOK",
              message: "Adapty webhook payload is invalid",
            },
          });
        }
        throw error;
      }
    });
  };
}

export const adaptyWebhookRoutes = createAdaptyWebhookRoutes();
