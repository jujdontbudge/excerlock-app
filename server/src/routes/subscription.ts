import type { FastifyPluginAsync } from "fastify";
import { config } from "../config.js";
import { createDrizzleAdaptyWebhookRepository, createAdaptyProfileGateway, createSubscriptionResyncService } from "../subscriptions/index.js";
import { requireActiveRouteUserId } from "./vendorRouteSupport.js";

export interface SubscriptionResync { resync(userId: string): Promise<unknown> }
const inFlight = new Map<string, Promise<unknown>>();
export function createSubscriptionRoutes(dependencies: { resync?: SubscriptionResync } = {}): FastifyPluginAsync {
  return async (app) => {
    app.post("/subscription/resync", { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } }, async (request, reply) => {
      const userId = await requireActiveRouteUserId(request, reply);
      if (!userId) return;
      if (request.body && typeof request.body === "object" && Object.keys(request.body as object).length > 0) {
        return reply.code(400).send({ error: { code: "INVALID_RESYNC_REQUEST", message: "Subscription resync does not accept identity or environment input" } });
      }
      if (!config.adaptySecretKey && !dependencies.resync) return reply.code(503).send({ error: { code: "SUBSCRIPTION_RESYNC_UNAVAILABLE", message: "Subscription resync is temporarily unavailable" } });
      const service = dependencies.resync ?? createSubscriptionResyncService({ repository: createDrizzleAdaptyWebhookRepository(), gateway: createAdaptyProfileGateway(config.adaptySecretKey as string, fetch, config.deletionGatewayTimeoutMs) });
      let operation = inFlight.get(userId);
      if (!operation) { operation = service.resync(userId).finally(() => inFlight.delete(userId)); inFlight.set(userId, operation); }
      try { return await operation; } catch { return reply.code(503).send({ error: { code: "SUBSCRIPTION_RESYNC_FAILED", message: "Subscription status could not be refreshed" } }); }
    });
  };
}
export const subscriptionRoutes = createSubscriptionRoutes();
