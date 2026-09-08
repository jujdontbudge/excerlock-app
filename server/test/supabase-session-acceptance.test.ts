import Fastify, { type FastifyInstance } from "fastify";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The task's acceptance check, run in process: a Supabase dev token reaches
 * `GET /v1/user`, and a Clerk-style token is refused. Everything is real here
 * except the key set (stubbed) and the database (a stub repository), so the
 * auth hook, the route registration and the token itself are all exercised.
 */
const PROJECT_URL = "https://hqgqhefftjxwdhqeushr.supabase.co";
const ISSUER = `${PROJECT_URL}/auth/v1`;

let privateKey: CryptoKey;
let app: FastifyInstance | undefined;
let serial = 0;

beforeEach(async () => {
  serial += 1;
  const pair = await generateKeyPair("ES256", { extractable: true });
  privateKey = pair.privateKey;
  const publicJwk = await exportJWK(pair.publicKey);
  vi.stubEnv("SUPABASE_URL", PROJECT_URL);
  // A distinct key-set url per test: jose caches by url for the process life.
  vi.stubEnv(
    "SUPABASE_JWT_JWKS_URL",
    `${ISSUER}/.well-known/jwks.json?acceptance=${serial}`,
  );
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({
        keys: [
          { ...publicJwk, alg: "ES256", kid: "supabase-test-key", use: "sig" },
        ],
      }),
    ),
  );
  vi.resetModules();
});

afterEach(async () => {
  await app?.close();
  app = undefined;
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

async function supabaseToken(isAnonymous: boolean): Promise<string> {
  return new SignJWT({ role: "authenticated", is_anonymous: isAnonymous })
    .setProtectedHeader({ alg: "ES256", kid: "supabase-test-key", typ: "JWT" })
    .setSubject("8f0c1d2e-1111-4222-8333-444455556666")
    .setIssuer(ISSUER)
    .setAudience("authenticated")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(privateKey);
}

async function clerkStyleToken(): Promise<string> {
  const { privateKey: clerkKey } = await generateKeyPair("RS256", {
    extractable: true,
  });
  return new SignJWT({ roles: ["member"] })
    .setProtectedHeader({ alg: "RS256", kid: "clerk-test-key", typ: "JWT" })
    .setSubject("user_2abcDEF")
    .setIssuer("https://example.clerk.accounts.dev")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(clerkKey);
}

/** The real auth hook and the real route, over a stub identity store. */
async function buildAuthenticatedApp(): Promise<FastifyInstance> {
  const { requireAuth } = await import("../src/auth.js");
  const { createUserRoutes } = await import("../src/routes/user.js");
  const instance = Fastify({ logger: false });
  await instance.register(
    async (scope) => {
      scope.addHook("onRequest", requireAuth);
      await scope.register(
        createUserRoutes({
          deletion: { deleteAccount: vi.fn() },
          identity: {
            ensureActiveUser: vi.fn(),
            findUser: async () => ({
              createdAt: new Date("2026-09-01T12:00:00.000Z"),
              deletedAt: null,
            }),
          },
        }),
      );
    },
    { prefix: "/v1" },
  );
  return instance;
}

describe("a Supabase dev token against GET /v1/user", () => {
  it("is accepted and reports the signed-in identity", async () => {
    app = await buildAuthenticatedApp();

    const response = await app.inject({
      method: "GET",
      url: "/v1/user",
      headers: { authorization: `Bearer ${await supabaseToken(false)}` },
    });

    expect({ status: response.statusCode, body: response.json() }).toEqual({
      status: 200,
      body: {
        id: "8f0c1d2e-1111-4222-8333-444455556666",
        isAnonymous: false,
        createdAt: "2026-09-01T12:00:00.000Z",
      },
    });
  });

  it("carries the anonymous claim through to the response", async () => {
    app = await buildAuthenticatedApp();

    const response = await app.inject({
      method: "GET",
      url: "/v1/user",
      headers: { authorization: `Bearer ${await supabaseToken(true)}` },
    });

    expect(response.json<{ isAnonymous: boolean }>().isAnonymous).toBe(true);
  });

  it("refuses a Clerk-style token", async () => {
    app = await buildAuthenticatedApp();

    const response = await app.inject({
      method: "GET",
      url: "/v1/user",
      headers: { authorization: `Bearer ${await clerkStyleToken()}` },
    });

    expect({ status: response.statusCode, body: response.json() }).toEqual({
      status: 401,
      body: {
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid or expired Supabase session",
        },
      },
    });
  });
});

describe("the composed server", () => {
  it("passes a Supabase token through the auth boundary of every protected route", async () => {
    const { buildServer } = await import("../src/index.js");
    app = buildServer({ logger: false });
    const authorization = `Bearer ${await supabaseToken(false)}`;

    const responses = await Promise.all(
      ["/v1/user", "/v1/sync"].map((url) =>
        app!.inject({ method: "GET", url, headers: { authorization } }),
      ),
    );

    // The database is unconfigured in tests, so these land on the routes'
    // fail-closed 503 — which is only reachable once auth has succeeded.
    expect(responses.map((response) => response.statusCode)).toEqual([
      503, 503,
    ]);
  });

  it("refuses a Clerk-style token on every protected route", async () => {
    const { buildServer } = await import("../src/index.js");
    app = buildServer({ logger: false });
    const authorization = `Bearer ${await clerkStyleToken()}`;

    const responses = await Promise.all([
      app.inject({ method: "GET", url: "/v1/user", headers: { authorization } }),
      app.inject({ method: "GET", url: "/v1/sync", headers: { authorization } }),
      app.inject({
        method: "PUT",
        url: "/v1/sync/rules",
        headers: { authorization },
        payload: { rules: [] },
      }),
      app.inject({
        method: "POST",
        url: "/v1/support",
        headers: { authorization },
        payload: { category: "bug", message: "Nope." },
      }),
    ]);

    expect(responses.map((response) => response.statusCode)).toEqual([
      401, 401, 401, 401,
    ]);
  });

  it("keeps liveness and readiness open to the load balancer", async () => {
    const { buildServer } = await import("../src/index.js");
    app = buildServer({ logger: false });

    const health = await app.inject({ method: "GET", url: "/v1/health" });
    const ready = await app.inject({ method: "GET", url: "/v1/ready" });

    expect({ health: health.statusCode, ready: ready.statusCode }).toEqual({
      health: 200,
      ready: 503,
    });
  });
});
