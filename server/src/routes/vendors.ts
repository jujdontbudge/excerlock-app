import type { FastifyPluginAsync } from "fastify";
import { config } from "../packages/config/config.js";
import {
  createDrizzleVendorRepository,
  createVendorOAuthService,
  type VendorOAuthCallback,
  type VendorOAuthService,
} from "../packages/vendors/index.js";
import {
  createVendorEventFeed,
  type VendorEventFeed,
} from "../packages/webhooks/index.js";
import {
  sendNotImplemented,
  type NotImplementedResponse,
} from "./notImplemented.js";
import {
  requireActiveRouteUserId,
  requireRouteVendor,
  sendVendorRouteError,
} from "./vendorRouteSupport.js";

interface VendorRouteDependencies {
  eventFeed?: VendorEventFeed;
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
        const userId = await requireActiveRouteUserId(request, reply);
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
        const userId = await requireActiveRouteUserId(request, reply);
        if (!userId) {
          return;
        }
        const vendor = await requireRouteVendor(
          request.params.vendor,
          reply,
        );
        if (!vendor) {
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
        const userId = await requireActiveRouteUserId(request, reply);
        if (!userId) {
          return;
        }
        const vendor = await requireRouteVendor(
          request.params.vendor,
          reply,
        );
        if (!vendor) {
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
