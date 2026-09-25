import type { FastifyPluginAsync } from "fastify";
import { config } from "../packages/config/config.js";
import { getDb } from "../packages/db/index.js";
import { checkSchemaReady, type ReadinessResult } from "../packages/db/readiness.js";
import type { Environment } from "../packages/config/env.js";
import { isUserDeletionConfigured } from "../packages/user-deletion/configuration.js";

export interface HealthResponse {
  ok: true;
  version: string;
  uptime: number;
}

export type ServiceReadinessResult =
  | ReadinessResult
  | { ready: false; reason: "configuration-missing" };
export type ReadyResponse = ServiceReadinessResult & { version: string };

interface HealthRouteDependencies {
  checkSchema?: () => Promise<ReadinessResult>;
  environment?: Environment;
}

export async function checkServiceReady(
  environment: Environment,
  checkSchema: () => Promise<ReadinessResult>,
): Promise<ServiceReadinessResult> {
  const schema = await checkSchema();
  if (!schema.ready) return schema;
  if (environment.nodeEnv === "production" && !isUserDeletionConfigured(environment)) {
    return { ready: false, reason: "configuration-missing" };
  }
  return { ready: true };
}

export function createHealthRoutes(
  dependencies: HealthRouteDependencies = {},
): FastifyPluginAsync {
  const environment = dependencies.environment ?? config;
  const checkSchema = dependencies.checkSchema ?? (() => checkSchemaReady(getDb()));
  const checkReady = () => checkServiceReady(environment, checkSchema);

  return async (app) => {
    app.get<{ Reply: HealthResponse }>(
      "/health",
      { config: { rateLimit: false } },
      async () => ({
        ok: true,
        version: config.version,
        uptime: process.uptime(),
      }),
    );

    app.get<{ Reply: ReadyResponse }>(
      "/ready",
      { config: { rateLimit: false } },
      async (_request, reply) => {
        const result = await checkReady();
        if (!result.ready) {
          return reply.code(503).send({ ...result, version: config.version });
        }
        return { ...result, version: config.version };
      },
    );
  };
}

export const healthRoutes: FastifyPluginAsync = createHealthRoutes();
