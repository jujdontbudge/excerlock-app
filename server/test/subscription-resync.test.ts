import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { authorizeProduction, createSubscriptionResyncService, type AdaptyWebhookRepository, type EnvironmentObservation } from "../src/subscriptions/index.js";
import { createSubscriptionRoutes } from "../src/routes/subscription.js";

const UID = "550e8400-e29b-41d4-a716-446655440000";
function memoryRepository(seed: EnvironmentObservation[] = []): AdaptyWebhookRepository {
  const rows = new Map(seed.map((item) => [item.environment, item]));
  return {
    record: vi.fn(),
    writeObservation: vi.fn(async (_uid, observation) => { rows.set(observation.environment, observation); return true; }),
    readSubscriptionState: vi.fn(async (_uid, environment) => rows.get(environment) ?? null),
  };
}

describe("subscription environment authorization", () => {
  it("denies active sandbox when production is absent or inactive", () => {
    const sandbox: EnvironmentObservation = { environment: "sandbox", status: "active", hasAccess: true, expiresAt: null, isInGracePeriod: false, observedAt: new Date(), source: "webhook", syncState: "current" };
    expect(authorizeProduction(null).hasAccess).toBe(false);
    expect(authorizeProduction(sandbox).hasAccess).toBe(false);
    expect(authorizeProduction({ ...sandbox, environment: "production", status: "unknown" }).hasAccess).toBe(false);
    expect(authorizeProduction({ ...sandbox, environment: "production", status: "none", hasAccess: false }).hasAccess).toBe(false);
  });

  it("fails closed for the unproven profile environment shape and preserves webhook state", async () => {
    const existing: EnvironmentObservation = { environment: "production", status: "active", hasAccess: true, expiresAt: new Date("2027-01-01T00:00:00Z"), isInGracePeriod: false, observedAt: new Date("2026-09-01T00:00:00Z"), source: "webhook", syncState: "current" };
    const repository = memoryRepository([existing]);
    const service = createSubscriptionResyncService({ repository, gateway: { fetchProfile: vi.fn(async () => ({ data: { profile: {
      profile_has_access_level: true,
      access_levels: {
        prod: { environment: "Production", is_active: false, expires_at: "2026-01-01T00:00:00Z" },
        test: { environment: "Sandbox", is_active: true, expires_at: "2027-01-01T00:00:00Z" },
      },
    } } })) }, now: () => new Date("2026-09-10T00:00:00Z") });
    const result = await service.resync(UID);
    expect(result.authorization.hasAccess).toBe(false);
    expect(result.authorization.status).toBe("unknown");
    expect(result.observations.production).toEqual(expect.objectContaining({ hasAccess: true, syncState: "unavailable" }));
    expect(repository.writeObservation).not.toHaveBeenCalled();

    const ambiguous = memoryRepository();
    const ambiguousResult = await createSubscriptionResyncService({ repository: ambiguous, gateway: { fetchProfile: vi.fn(async () => ({ profile_has_access_level: true })) } }).resync(UID);
    expect(ambiguousResult.authorization).toEqual(expect.objectContaining({ environment: "production", status: "unknown", hasAccess: false }));
    expect(ambiguous.writeObservation).not.toHaveBeenCalled();
  });
});

describe("POST /v1/subscription/resync", () => {
  let app: FastifyInstance | undefined;
  afterEach(async () => { await app?.close(); app = undefined; });
  it("uses only the verified UID and rejects environment/user spoofing", async () => {
    const resync = vi.fn(async () => ({ authorization: { environment: "production", status: "unknown", hasAccess: false, expiresAt: null } }));
    app = Fastify();
    app.addHook("onRequest", async (request) => { request.authIdentity = { userId: UID, roles: [], provider: "supabase", isAnonymous: true }; });
    await app.register(createSubscriptionRoutes({ resync: { resync } }), { prefix: "/v1" });
    const spoof = await app.inject({ method: "POST", url: "/v1/subscription/resync", payload: { userId: "other", environment: "sandbox" } });
    expect(spoof.statusCode).toBe(400);
    expect(resync).not.toHaveBeenCalled();
    const own = await app.inject({ method: "POST", url: "/v1/subscription/resync" });
    expect(own.statusCode).toBe(200);
    expect(resync).toHaveBeenCalledWith(UID);
  });
});
