import type { FastifyPluginAsync } from "fastify";
import { config } from "../packages/config/config.js";
import { createComplimentaryAccessRepository, createDrizzleAdaptyWebhookRepository, createAdaptyProfileGateway, createSubscriptionResyncService, verifyXcodeTransaction, xcodeAuthorization } from "../packages/subscriptions/index.js";
import { createSupabaseConfirmedEmailReader } from "../packages/identity/confirmedEmail.js";
import { requireActiveRouteUserId } from "./vendorRouteSupport.js";

export interface SubscriptionResync { resync(userId: string): Promise<unknown> }
const inFlight = new Map<string, Promise<unknown>>();
export function createSubscriptionRoutes(dependencies: { resync?: SubscriptionResync } = {}): FastifyPluginAsync {
  return async (app) => {
    app.post("/subscription/resync", { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } }, async (request, reply) => {
      const userId = await requireActiveRouteUserId(request, reply);
      if (!userId) return;
      const body = request.body && typeof request.body === "object" ? (request.body as Record<string, unknown>) : {};
      const keys = Object.keys(body);
      if (config.xcodeStoreKitRootSha256 && keys.length === 1 && keys[0] === "storeKitTestTransaction" && typeof body.storeKitTestTransaction === "string") {
        const expiresAt = verifyXcodeTransaction(body.storeKitTestTransaction, config.xcodeStoreKitRootSha256);
        if (expiresAt) return xcodeAuthorization(userId, expiresAt);
        return reply.code(400).send({ error: { code: "INVALID_STOREKIT_TEST_TRANSACTION", message: "StoreKit test transaction was not accepted" } });
      }
      if (keys.length > 0) {
        return reply.code(400).send({ error: { code: "INVALID_RESYNC_REQUEST", message: "Subscription resync does not accept identity or environment input" } });
      }

      const service = dependencies.resync ?? createSubscriptionResyncService({
        repository: createDrizzleAdaptyWebhookRepository(),
        gateway: config.adaptySecretKey ? createAdaptyProfileGateway(config.adaptySecretKey, config.adaptyApiUrl, fetch, config.deletionGatewayTimeoutMs) : { fetchProfile: async () => { throw new Error("Subscription resync is unavailable"); } },
        ...(config.supabaseUrl && config.supabaseServiceRoleKey ? { complimentary: {
          readEmail: createSupabaseConfirmedEmailReader({ supabaseUrl: config.supabaseUrl, serviceRoleKey: config.supabaseServiceRoleKey }).read,
          readGrant: createComplimentaryAccessRepository().read,
        } } : {}),
        authorizationEnvironment: config.subscriptionAuthorizationStoreEnvironment,
      });
      let operation = inFlight.get(userId);
      if (!operation) { operation = service.resync(userId).finally(() => inFlight.delete(userId)); inFlight.set(userId, operation); }
      try { return await operation; } catch { return reply.code(503).send({ error: { code: "SUBSCRIPTION_RESYNC_FAILED", message: "Subscription status could not be refreshed" } }); }
    });
  };
}
export const subscriptionRoutes = createSubscriptionRoutes();
