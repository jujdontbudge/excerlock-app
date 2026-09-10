import type { FastifyInstance } from "fastify";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { afterEach, describe, expect, it, vi } from "vitest";

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

const SUPABASE_URL = "https://xyzcompany.supabase.co";
const SUPABASE_ISSUER = `${SUPABASE_URL}/auth/v1`;
const SUPABASE_UUID = "550e8400-e29b-41d4-a716-446655440000";

async function supabaseToken(
  privateKey: CryptoKey,
  kid: string,
  overrides: Record<string, unknown> = {},
): Promise<string> {
  return await new SignJWT({ role: "authenticated", ...overrides })
    .setProtectedHeader({ alg: "RS256", kid, typ: "JWT" })
    .setSubject(SUPABASE_UUID)
    .setIssuer(overrides.iss ?? SUPABASE_ISSUER)
    .setAudience((overrides.aud as string) ?? "authenticated")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(privateKey);
}

describe("protected routes with Clerk configured", () => {
  it("rejects an invalid bearer token as unauthorized", async () => {
    vi.stubEnv("CLERK_SECRET_KEY", "sk_test_example");
    vi.resetModules();
    const { buildServer } = await import("../src/index.js");
    app = buildServer({ logger: false });

    const response = await app.inject({
      method: "GET",
      url: "/v1/user",
      headers: { authorization: "Bearer not-a-jwt" },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: {
        code: "UNAUTHORIZED",
        message: "Invalid or expired Clerk session",
      },
    });
  });
});

describe("protected routes with Supabase configured", () => {
  it("rejects a missing bearer token", async () => {
    vi.stubEnv("SUPABASE_URL", SUPABASE_URL);
    vi.resetModules();
    const { buildServer } = await import("../src/index.js");
    app = buildServer({ logger: false });

    const response = await app.inject({ method: "GET", url: "/v1/vendors" });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: {
        code: "UNAUTHORIZED",
        message: "Missing Authorization: Bearer <token>",
      },
    });
  });

  it("accepts a verified Supabase JWT through neutral identity (anonymous supported)", async () => {
    const { privateKey, publicKey } = await generateKeyPair("RS256");
    const publicJwk = await exportJWK(publicKey);
    vi.stubEnv("SUPABASE_URL", SUPABASE_URL);
    vi.resetModules();
    const { buildServer } = await import("../src/index.js");
    const { clearAuthJwksCache } = await import("../src/auth.js");
    clearAuthJwksCache();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          keys: [{ ...publicJwk, alg: "RS256", kid: "sup-key", use: "sig" }],
        }),
      ),
    );
    app = buildServer({ logger: false });

    const token = await new SignJWT({
      role: "authenticated",
      is_anonymous: true,
    })
      .setProtectedHeader({ alg: "RS256", kid: "sup-key", typ: "JWT" })
      .setSubject(SUPABASE_UUID)
      .setIssuer(SUPABASE_ISSUER)
      .setAudience("authenticated")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(privateKey);

    // GET /v1/vendors is protected but needs no DB; 501 proves auth passed.
    const response = await app.inject({
      method: "GET",
      url: "/v1/vendors",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.statusCode).toBe(501);
    expect(response.json()).toEqual({
      error: { code: "NOT_IMPLEMENTED", message: "Vendors API is not implemented" },
    });
  });

  it("rejects forged, wrong-issuer, wrong-audience, and expired Supabase tokens", async () => {
    const { privateKey, publicKey } = await generateKeyPair("RS256");
    const publicJwk = await exportJWK(publicKey);
    const { privateKey: attackerKey } = await generateKeyPair("RS256");
    vi.stubEnv("SUPABASE_URL", SUPABASE_URL);
    vi.resetModules();
    const { buildServer } = await import("../src/index.js");
    const { clearAuthJwksCache } = await import("../src/auth.js");
    clearAuthJwksCache();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          keys: [{ ...publicJwk, alg: "RS256", kid: "sup-key" }],
        }),
      ),
    );
    app = buildServer({ logger: false });

    const forged = await supabaseToken(attackerKey, "sup-key");
    const wrongIssuer = await new SignJWT({ role: "authenticated" })
      .setProtectedHeader({ alg: "RS256", kid: "sup-key" })
      .setSubject(SUPABASE_UUID)
      .setIssuer("https://attacker.supabase.co/auth/v1")
      .setAudience("authenticated")
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(privateKey);
    const wrongAud = await new SignJWT({})
      .setProtectedHeader({ alg: "RS256", kid: "sup-key" })
      .setSubject(SUPABASE_UUID)
      .setIssuer(SUPABASE_ISSUER)
      .setAudience("service_role")
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(privateKey);
    const expired = await new SignJWT({})
      .setProtectedHeader({ alg: "RS256", kid: "sup-key" })
      .setSubject(SUPABASE_UUID)
      .setIssuer(SUPABASE_ISSUER)
      .setAudience("authenticated")
      .setIssuedAt("2h ago")
      .setExpirationTime("1h ago")
      .sign(privateKey);

    for (const token of [forged, wrongIssuer, wrongAud, expired, "not-a-jwt"]) {
      const res = await app.inject({
        method: "GET",
        url: "/v1/vendors",
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(401);
      expect(res.json()).toEqual({
        error: { code: "UNAUTHORIZED", message: "Invalid or expired session" },
      });
    }
  });

  it("rejects HS256 tokens when the project uses RS256 JWKS (no alg confusion)", async () => {
    vi.stubEnv("SUPABASE_URL", SUPABASE_URL);
    vi.resetModules();
    const { buildServer } = await import("../src/index.js");
    const { clearAuthJwksCache } = await import("../src/auth.js");
    clearAuthJwksCache();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ keys: [] })),
    );
    app = buildServer({ logger: false });
    const key = new TextEncoder().encode("arbitrary-secret-for-test-only");
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setSubject(SUPABASE_UUID)
      .setIssuer(SUPABASE_ISSUER)
      .setAudience("authenticated")
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(key);
    const res = await app.inject({
      method: "GET",
      url: "/v1/vendors",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(401);
  });
});
