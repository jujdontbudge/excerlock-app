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
  complimentaryAccessChecked?: boolean;
}

type ComplimentaryGrant = { grantedAt: Date; expiresAt: Date };
type ComplimentaryReader = {
  readEmail(userId: string): Promise<string | null>;
  readGrant(userId: string, email: string, environment: AdaptyEnvironment, now: Date): Promise<ComplimentaryGrant | null>;
};

export function createSubscriptionResyncService(options: {
  repository: AdaptyWebhookRepository;
  gateway: AdaptyProfileGateway;
  authorizationEnvironment: AdaptyEnvironment;
  complimentary?: ComplimentaryReader;
  now?: () => Date;
}) {
  const now = options.now ?? (() => new Date());
  const grantResult = (userId: string, grant: ComplimentaryGrant, verifiedAt: Date): SubscriptionResyncResult => ({
    accountId: userId,
    authorization: { environment: options.authorizationEnvironment, status: "active", hasAccess: true, expiresAt: grant.expiresAt, observedAt: grant.grantedAt, source: "complimentary" },
    observations: { production: null, sandbox: null },
    verifiedAt,
    complimentaryAccessChecked: true,
  });
  return { async resync(userId: string): Promise<SubscriptionResyncResult> {
    const checkedAt = now();
    let grant: ComplimentaryGrant | null = null;
    let complimentaryUnavailable = false;
    let complimentaryAccessChecked = false;
    try {
      if (options.complimentary) {
        const email = await options.complimentary.readEmail(userId);
        grant = email ? await options.complimentary.readGrant(userId, email, options.authorizationEnvironment, checkedAt) : null;
        complimentaryAccessChecked = true;
      }
    } catch { complimentaryUnavailable = true; }
    if (grant) {
      const paid = await options.repository.readSubscriptionState(userId, options.authorizationEnvironment);
      if (!authorizeEnvironment(paid, options.authorizationEnvironment, checkedAt).hasAccess) return grantResult(userId, grant, checkedAt);
    }
    try { await options.gateway.fetchProfile(userId); }
    catch {
      const verifiedAt = now();
      if (grant && grant.expiresAt > verifiedAt) return grantResult(userId, grant, verifiedAt);
      if (!complimentaryAccessChecked) throw new Error("Subscription status could not be refreshed");
      return { accountId: userId, authorization: authorizeEnvironment(null, options.authorizationEnvironment, verifiedAt), observations: { production: null, sandbox: null }, verifiedAt, complimentaryAccessChecked: true };
    }
    const verifiedAt = now();
    const markUnavailable = (value: EnvironmentObservation | null) => value ? { ...value, syncState: "unavailable" as const } : null;
    const production = await options.repository.readSubscriptionState(userId, "production");
    const sandbox = await options.repository.readSubscriptionState(userId, "sandbox");
    const selected = options.authorizationEnvironment === "production" ? production : sandbox;
    const authorization = authorizeEnvironment(selected, options.authorizationEnvironment, verifiedAt);
    if (!authorization.hasAccess && grant && grant.expiresAt > verifiedAt) return grantResult(userId, grant, verifiedAt);
    if (complimentaryUnavailable && !authorization.hasAccess) throw new Error("Complimentary access could not be checked");
    return {
      accountId: userId,
      authorization,
      observations: { production: markUnavailable(production), sandbox: markUnavailable(sandbox) },
      verifiedAt,
      complimentaryAccessChecked,
    };
  } };
}
