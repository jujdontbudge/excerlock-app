import type { AdaptyEnvironment } from "../../db/schema.js";
import { authorizeEnvironment, type AdaptyWebhookRepository, type EnvironmentObservation } from "./repository.js";

export interface AdaptyProfileGateway { fetchProfile(userId: string): Promise<unknown> }
export function createAdaptyProfileGateway(secretKey: string, apiUrl: string, fetcher: typeof fetch = fetch, timeoutMs = 10_000): AdaptyProfileGateway {
  return { async fetchProfile(userId) {
    const response = await fetcher(new URL("/api/v2/server-side-api/profile/", apiUrl), {
      headers: { Authorization: `Api-Key ${secretKey}`, "adapty-customer-user-id": userId },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) throw new Error("Adapty profile resync failed");
    return response.json();
  } };
}

export interface SubscriptionResyncResult {
  accountId: string;
  authorization: ReturnType<typeof authorizeEnvironment>;
  observations: Record<AdaptyEnvironment, EnvironmentObservation | null>;
  verifiedAt: Date;
}

export function createSubscriptionResyncService(options: { repository: AdaptyWebhookRepository; gateway: AdaptyProfileGateway; authorizationEnvironment: AdaptyEnvironment; now?: () => Date }) {
  const now = options.now ?? (() => new Date());
  return { async resync(userId: string): Promise<SubscriptionResyncResult> {
    await options.gateway.fetchProfile(userId);
    const verifiedAt = now();
    const markUnavailable = (value: EnvironmentObservation | null) => value ? { ...value, syncState: "unavailable" as const } : null;
    const production = await options.repository.readSubscriptionState(userId, "production");
    const sandbox = await options.repository.readSubscriptionState(userId, "sandbox");
    const selected = options.authorizationEnvironment === "production" ? production : sandbox;
    return {
      accountId: userId,
      authorization: authorizeEnvironment(selected, options.authorizationEnvironment, verifiedAt),
      observations: { production: markUnavailable(production), sandbox: markUnavailable(sandbox) },
      verifiedAt,
    };
  } };
}
