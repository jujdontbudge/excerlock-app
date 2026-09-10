import type { AdaptyEnvironment } from "../db/schema.js";
import { authorizeProduction, type AdaptyWebhookRepository, type EnvironmentObservation } from "./repository.js";

export interface AdaptyProfileGateway { fetchProfile(userId: string): Promise<unknown> }
export function createAdaptyProfileGateway(secretKey: string, fetcher: typeof fetch = fetch, timeoutMs = 10_000): AdaptyProfileGateway {
  return { async fetchProfile(userId) {
    const response = await fetcher("https://api.adapty.io/api/v2/server-side-api/profile/", {
      headers: { Authorization: `Api-Key ${secretKey}`, "adapty-customer-user-id": userId },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) throw new Error("Adapty profile resync failed");
    return response.json();
  } };
}

export interface SubscriptionResyncResult {
  authorization: ReturnType<typeof authorizeProduction>;
  observations: Record<AdaptyEnvironment, EnvironmentObservation | null>;
  syncedAt: Date;
}

export function createSubscriptionResyncService(options: { repository: AdaptyWebhookRepository; gateway: AdaptyProfileGateway; now?: () => Date }) {
  const now = options.now ?? (() => new Date());
  return { async resync(userId: string): Promise<SubscriptionResyncResult> {
    const syncedAt = now();
    await options.gateway.fetchProfile(userId);
    // The documented server-side profile schema does not prove a store
    // environment for each premium access-level aggregate. Until Adapty
    // documents that binding, resync is deliberately read-only/fail-closed.
    const markUnavailable = (value: EnvironmentObservation | null) => value ? { ...value, syncState: "unavailable" as const } : null;
    const production = await options.repository.readSubscriptionState(userId, "production");
    const sandbox = markUnavailable(await options.repository.readSubscriptionState(userId, "sandbox"));
    return { authorization: authorizeProduction(production, syncedAt), observations: { production: markUnavailable(production), sandbox }, syncedAt };
  } };
}
