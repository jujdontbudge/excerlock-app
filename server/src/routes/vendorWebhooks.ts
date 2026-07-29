import type {
  FastifyPluginAsync,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { config } from "../config.js";
import type { Environment } from "../env.js";
import {
  createDrizzleVendorRepository,
  type Vendor,
} from "../vendors/index.js";
import {
  createVendorWebhookService,
  requireVendorWebhookConfiguration,
  verifyOuraWebhook,
  verifyPolarWebhook,
  verifyStravaChallenge,
  verifyStravaSubscription,
  verifyWhoopWebhook,
  type VendorWebhookConfiguration,
  type VendorWebhookService,
} from "../webhooks/index.js";
import {
  requireRouteVendor,
  sendVendorRouteError,
} from "./vendorRouteSupport.js";

interface VendorWebhookRouteDependencies {
  environment?: Environment;
  service?: VendorWebhookService;
}

interface VendorParams {
  vendor: string;
}

interface RawJsonBody {
  rawBody: string;
  payload: Record<string, unknown>;
}

interface WebhookChallengeQuery {
  "hub.mode"?: string;
  "hub.challenge"?: string;
  "hub.verify_token"?: string;
  challenge?: string;
  verification_token?: string;
}

function getWebhookService(
  dependencies: VendorWebhookRouteDependencies,
): VendorWebhookService {
  return (
    dependencies.service ??
    createVendorWebhookService({
      repository: createDrizzleVendorRepository(),
    })
  );
}

function readHeader(
  headers: FastifyRequest["headers"],
  name: string,
): string | null {
  const value = headers[name];
  return typeof value === "string" ? value : null;
}

function verifyWebhookRequest(
  configuration: VendorWebhookConfiguration,
  body: RawJsonBody,
  request: FastifyRequest,
): boolean {
  switch (configuration.vendor) {
    case "strava":
      return verifyStravaSubscription(
        body.payload,
        configuration.subscriptionId,
      );
    case "oura": {
      const timestamp = readHeader(request.headers, "x-oura-timestamp");
      const signature = readHeader(request.headers, "x-oura-signature");
      return Boolean(
        timestamp &&
          signature &&
          verifyOuraWebhook({
            rawBody: body.rawBody,
            timestamp,
            signature,
            clientSecret: configuration.clientSecret,
          }),
      );
    }
    case "whoop": {
      const timestamp = readHeader(
        request.headers,
        "x-whoop-signature-timestamp",
      );
      const signature = readHeader(
        request.headers,
        "x-whoop-signature",
      );
      return Boolean(
        timestamp &&
          signature &&
          verifyWhoopWebhook({
            rawBody: body.rawBody,
            timestamp,
            signature,
            clientSecret: configuration.clientSecret,
          }),
      );
    }
    case "polar": {
      const signature = readHeader(
        request.headers,
        "polar-webhook-signature",
      );
      return Boolean(
        signature &&
          verifyPolarWebhook({
            rawBody: body.rawBody,
            signature,
            signatureSecret: configuration.signatureSecret,
          }),
      );
    }
  }
}

async function sendWebhookUnauthorized(reply: FastifyReply): Promise<void> {
  await reply.code(401).send({
    error: {
      code: "WEBHOOK_VERIFICATION_FAILED",
      message: "Vendor webhook verification failed",
    },
  });
}

function parseRawJsonBody(
  buffer: Buffer,
): RawJsonBody {
  const rawBody = buffer.toString("utf8");
  const payload: unknown = JSON.parse(rawBody);
  if (
    typeof payload !== "object" ||
    payload === null ||
    Array.isArray(payload)
  ) {
    throw new Error("Webhook JSON body must be an object");
  }
  return {
    rawBody,
    payload: payload as Record<string, unknown>,
  };
}

function isValidChallenge(
  vendor: Vendor,
  query: WebhookChallengeQuery,
  configuration: VendorWebhookConfiguration,
): string | null {
  if (
    vendor === "strava" &&
    configuration.vendor === "strava" &&
    query["hub.mode"] === "subscribe" &&
    query["hub.challenge"] &&
    query["hub.verify_token"] &&
    verifyStravaChallenge(
      query["hub.verify_token"],
      configuration.verifyToken,
    )
  ) {
    return query["hub.challenge"];
  }
  if (
    vendor === "oura" &&
    configuration.vendor === "oura" &&
    query.challenge &&
    query.verification_token &&
    verifyStravaChallenge(
      query.verification_token,
      configuration.verifyToken,
    )
  ) {
    return query.challenge;
  }
  return null;
}

export function createVendorWebhookRoutes(
  dependencies: VendorWebhookRouteDependencies = {},
): FastifyPluginAsync {
  return async (app) => {
    app.removeContentTypeParser("application/json");
    app.addContentTypeParser<Buffer>(
      "application/json",
      { parseAs: "buffer", bodyLimit: 262_144 },
      (_request, buffer, done) => {
        try {
          done(null, parseRawJsonBody(buffer));
        } catch (error) {
          done(
            error instanceof Error
              ? error
              : new Error("Webhook JSON body is invalid"),
          );
        }
      },
    );

    app.get<{
      Params: VendorParams;
      Querystring: WebhookChallengeQuery;
    }>("/vendors/:vendor/webhook", async (request, reply) => {
      const vendor = await requireRouteVendor(request.params.vendor, reply);
      if (!vendor) {
        return;
      }

      try {
        const configuration = requireVendorWebhookConfiguration(
          dependencies.environment ?? config,
          vendor,
        );
        const challenge = isValidChallenge(
          vendor,
          request.query,
          configuration,
        );
        if (challenge && vendor === "strava") {
          return { "hub.challenge": challenge };
        }
        if (challenge && vendor === "oura") {
          return { challenge };
        }
        await sendWebhookUnauthorized(reply);
      } catch (error) {
        await sendVendorRouteError(reply, error);
      }
    });

    app.post<{ Params: VendorParams; Body: RawJsonBody }>(
      "/vendors/:vendor/webhook",
      async (request, reply) => {
        const vendor = await requireRouteVendor(
          request.params.vendor,
          reply,
        );
        if (!vendor) {
          return;
        }

        try {
          const configuration = requireVendorWebhookConfiguration(
            dependencies.environment ?? config,
            vendor,
          );
          if (
            !verifyWebhookRequest(configuration, request.body, request)
          ) {
            await sendWebhookUnauthorized(reply);
            return;
          }

          const result = await getWebhookService(
            dependencies,
          ).recordVerified(vendor, request.body.rawBody);
          return { accepted: true, ...result };
        } catch (error) {
          await sendVendorRouteError(reply, error);
        }
      },
    );
  };
}

export const vendorWebhookRoutes = createVendorWebhookRoutes();
