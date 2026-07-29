import type {
  FastifyPluginAsync,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { config } from "../config.js";
import type { Environment } from "../env.js";
import {
  createDrizzleVendorRepository,
  createVendorOAuthService,
  isVendor,
  type Vendor,
  type VendorOAuthCallback,
  type VendorOAuthService,
} from "../vendors/index.js";
import {
  createVendorEventFeed,
  createVendorWebhookService,
  requireVendorWebhookConfiguration,
  verifyOuraWebhook,
  verifyPolarWebhook,
  verifyStravaChallenge,
  verifyStravaSubscription,
  verifyWhoopWebhook,
  type VendorWebhookConfiguration,
  type VendorEventFeed,
  type VendorWebhookService,
} from "../webhooks/index.js";
import {
  sendNotImplemented,
  type NotImplementedResponse,
} from "./notImplemented.js";

interface VendorRouteDependencies {
  eventFeed?: VendorEventFeed;
  service?: VendorOAuthService;
}

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

interface OAuthCallbackQuery {
  code?: string;
  state?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

interface WebhookChallengeQuery {
  "hub.mode"?: string;
  "hub.challenge"?: string;
  "hub.verify_token"?: string;
  challenge?: string;
  verification_token?: string;
}

interface VendorEventQuery {
  cursor?: string;
  limit?: string;
}

function defaultService(): VendorOAuthService {
  return createVendorOAuthService({
    environment: config,
    repository: createDrizzleVendorRepository(),
  });
}

function getService(dependencies: VendorRouteDependencies): VendorOAuthService {
  return dependencies.service ?? defaultService();
}

function getEventFeed(
  dependencies: VendorRouteDependencies,
): VendorEventFeed {
  return (
    dependencies.eventFeed ??
    createVendorEventFeed(createDrizzleVendorRepository())
  );
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

async function requireRouteUserId(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<string | null> {
  const userId = request.clerkIdentity?.userId;
  if (!userId) {
    await reply.code(401).send({
      error: {
        code: "UNAUTHORIZED",
        message: "A verified Clerk user is required",
      },
    });
    return null;
  }
  return userId;
}

async function requireRouteVendor(
  vendor: string,
  reply: FastifyReply,
): Promise<Vendor | null> {
  if (!isVendor(vendor)) {
    await reply.code(404).send({
      error: {
        code: "UNKNOWN_VENDOR",
        message: `Unsupported vendor: ${vendor}`,
      },
    });
    return null;
  }
  return vendor;
}

async function sendVendorRouteError(
  reply: FastifyReply,
  error: unknown,
): Promise<void> {
  const message = error instanceof Error ? error.message : "Vendor request failed";
  const status =
    message.includes("not configured") ||
    message.includes("missing DATABASE_URL")
      ? 503
      : message.includes("upstream HTTP")
        ? 502
        : 400;

  await reply.code(status).send({
    error: {
      code:
        status === 503
          ? "VENDOR_NOT_CONFIGURED"
          : status === 502
            ? "VENDOR_UPSTREAM_ERROR"
            : "VENDOR_REQUEST_INVALID",
      message,
    },
  });
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

export function createVendorWebhookRoutes(
  dependencies: VendorWebhookRouteDependencies = {},
): FastifyPluginAsync {
  return async (app) => {
    app.removeContentTypeParser("application/json");
    app.addContentTypeParser<Buffer>(
      "application/json",
      { parseAs: "buffer", bodyLimit: 262_144 },
      (_request, buffer, done) => {
        const rawBody = buffer.toString("utf8");
        try {
          const payload: unknown = JSON.parse(rawBody);
          if (
            typeof payload !== "object" ||
            payload === null ||
            Array.isArray(payload)
          ) {
            throw new Error("Webhook JSON body must be an object");
          }
          done(null, {
            rawBody,
            payload: payload as Record<string, unknown>,
          });
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
        const environment = dependencies.environment ?? config;
        const configuration = requireVendorWebhookConfiguration(
          environment,
          vendor,
        );
        if (
          configuration.vendor === "strava" &&
          request.query["hub.mode"] === "subscribe" &&
          request.query["hub.challenge"] &&
          request.query["hub.verify_token"] &&
          verifyStravaChallenge(
            request.query["hub.verify_token"],
            configuration.verifyToken,
          )
        ) {
          return { "hub.challenge": request.query["hub.challenge"] };
        }
        if (
          configuration.vendor === "oura" &&
          request.query.challenge &&
          request.query.verification_token &&
          verifyStravaChallenge(
            request.query.verification_token,
            configuration.verifyToken,
          )
        ) {
          return { challenge: request.query.challenge };
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
          const environment = dependencies.environment ?? config;
          const configuration = requireVendorWebhookConfiguration(
            environment,
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

export function createVendorPublicRoutes(
  dependencies: VendorRouteDependencies = {},
): FastifyPluginAsync {
  return async (app) => {
    app.get<{ Params: VendorParams; Querystring: OAuthCallbackQuery }>(
      "/vendors/:vendor/callback",
      async (request, reply) => {
        const vendor = await requireRouteVendor(
          request.params.vendor,
          reply,
        );
        if (!vendor) {
          return;
        }

        const callback: VendorOAuthCallback = {
          state: request.query.state ?? "",
          ...(request.query.code ? { code: request.query.code } : {}),
          ...(request.query.scope ? { scope: request.query.scope } : {}),
          ...(request.query.error ? { error: request.query.error } : {}),
          ...(request.query.error_description
            ? { errorDescription: request.query.error_description }
            : {}),
        };

        try {
          return await getService(dependencies).completeConnection(
            vendor,
            callback,
          );
        } catch (error) {
          await sendVendorRouteError(reply, error);
        }
      },
    );
  };
}

export function createVendorProtectedRoutes(
  dependencies: VendorRouteDependencies = {},
): FastifyPluginAsync {
  return async (app) => {
    app.get<{ Reply: NotImplementedResponse }>(
      "/vendors",
      async (_request, reply) => sendNotImplemented(reply, "Vendors"),
    );

    app.get<{ Querystring: VendorEventQuery }>(
      "/vendors/events",
      async (request, reply) => {
        const userId = await requireRouteUserId(request, reply);
        if (!userId) {
          return;
        }

        const cursor = request.query.cursor ?? null;
        const limit =
          request.query.limit === undefined
            ? 50
            : Number(request.query.limit);
        try {
          return await getEventFeed(dependencies).readSince(
            userId,
            cursor,
            limit,
          );
        } catch (error) {
          await sendVendorRouteError(reply, error);
        }
      },
    );

    app.get<{ Params: VendorParams }>(
      "/vendors/:vendor/connect",
      async (request, reply) => {
        const userId = await requireRouteUserId(request, reply);
        const vendor = await requireRouteVendor(
          request.params.vendor,
          reply,
        );
        if (!userId || !vendor) {
          return;
        }

        try {
          const redirectUrl = await getService(
            dependencies,
          ).beginConnection(userId, vendor);
          return reply.redirect(redirectUrl);
        } catch (error) {
          await sendVendorRouteError(reply, error);
        }
      },
    );

    app.delete<{ Params: VendorParams }>(
      "/vendors/:vendor",
      async (request, reply) => {
        const userId = await requireRouteUserId(request, reply);
        const vendor = await requireRouteVendor(
          request.params.vendor,
          reply,
        );
        if (!userId || !vendor) {
          return;
        }

        try {
          return await getService(dependencies).disconnect(userId, vendor);
        } catch (error) {
          await sendVendorRouteError(reply, error);
        }
      },
    );
  };
}

export const vendorPublicRoutes = createVendorPublicRoutes();
export const vendorWebhookRoutes = createVendorWebhookRoutes();
export const vendorRoutes = createVendorProtectedRoutes();
