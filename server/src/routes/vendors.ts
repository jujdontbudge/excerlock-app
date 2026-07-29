import type {
  FastifyPluginAsync,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { config } from "../config.js";
import {
  createDrizzleVendorRepository,
  createVendorOAuthService,
  isVendor,
  type Vendor,
  type VendorOAuthCallback,
  type VendorOAuthService,
} from "../vendors/index.js";
import {
  sendNotImplemented,
  type NotImplementedResponse,
} from "./notImplemented.js";

interface VendorRouteDependencies {
  service?: VendorOAuthService;
}

interface VendorParams {
  vendor: string;
}

interface OAuthCallbackQuery {
  code?: string;
  state?: string;
  scope?: string;
  error?: string;
  error_description?: string;
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
export const vendorRoutes = createVendorProtectedRoutes();
