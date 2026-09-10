import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearAuthJwksCache,
  supabaseIssuerFor,
  supabaseJwksUrlFor,
  verifyAuthToken,
  verifyClerkJwt,
  verifySupabaseJwt,
  type SupabaseJwtConfig,
} from "../src/auth.js";

const SUPABASE_URL = "https://xyzcompany.supabase.co";
const SUPABASE_ISSUER = supabaseIssuerFor(SUPABASE_URL);
const SUPABASE_JWKS_URL = supabaseJwksUrlFor(SUPABASE_URL);
const SUPABASE_UUID = "550e8400-e29b-41d4-a716-446655440000";
const ANON_UUID = "123e4567-e89b-12d3-a456-426614174000";

afterEach(() => {
  vi.unstubAllGlobals();
  clearAuthJwksCache();
});

function rsConfig(overrides: Partial<SupabaseJwtConfig> = {}): SupabaseJwtConfig {
  return {
    issuer: SUPABASE_ISSUER,
    jwksUrl: SUPABASE_JWKS_URL,
    audience: "authenticated",
    algorithms: ["RS256", "ES256"],
    jwtSecret: undefined,
    ...overrides,
  };
}

async function signSupabaseRs(
  privateKey: CryptoKey,
  claims: Record<string, unknown>,
  header: Record<string, unknown> = {},
): Promise<string> {
  return await new SignJWT({ ...claims })
    .setProtectedHeader({ alg: "RS256", kid: "supabase-test-key", typ: "JWT", ...header })
    .setSubject((claims.sub as string) ?? SUPABASE_UUID)
    .setIssuer(SUPABASE_ISSUER)
    .setAudience("authenticated")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(privateKey);
}

describe("verifyClerkJwt", () => {
  it("accepts a Clerk session signed by the instance JWKS", async () => {
    const { privateKey, publicKey } = await generateKeyPair("RS256");
    const publicJwk = await exportJWK(publicKey);
    const token = await new SignJWT({ roles: ["member"] })
      .setProtectedHeader({ alg: "RS256", kid: "clerk-test-key", typ: "JWT" })
      .setSubject("user_123")
      .setIssuer("https://example.clerk.accounts.dev")
      .setIssuedAt()
      .setNotBefore("0s")
      .setExpirationTime("5m")
      .sign(privateKey);
    const fetchSpy = vi.fn(async () =>
      Response.json({
        keys: [{ ...publicJwk, alg: "RS256", kid: "clerk-test-key", use: "sig" }],
      }),
    );
    vi.stubGlobal("fetch", fetchSpy);

    await expect(verifyClerkJwt(token, "sk_test_example")).resolves.toEqual({
      userId: "user_123",
      roles: ["member"],
    });
    await expect(verifyClerkJwt(token, "sk_test_example")).resolves.toEqual({
      userId: "user_123",
      roles: ["member"],
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [jwksUrl, jwksRequest] = fetchSpy.mock.calls[0] ?? [];
    expect(jwksUrl).toBe("https://api.clerk.com/v1/jwks");
    expect(new Headers(jwksRequest?.headers).get("authorization")).toBe(
      "Bearer sk_test_example",
    );
  });

  it("enforces an explicit Clerk issuer when configured", async () => {
    const { privateKey, publicKey } = await generateKeyPair("RS256");
    const publicJwk = await exportJWK(publicKey);
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "RS256", kid: "k1", typ: "JWT" })
      .setSubject("user_123")
      .setIssuer("https://wrong.clerk.accounts.dev")
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(privateKey);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ keys: [{ ...publicJwk, alg: "RS256", kid: "k1" }] }),
      ),
    );
    await expect(
      verifyClerkJwt(token, "sk_test_example", {
        issuer: "https://example.clerk.accounts.dev",
      }),
    ).rejects.toThrow();
  });
});

describe("verifySupabaseJwt (RS256 JWKS)", () => {
  it("accepts an anonymous verified JWT", async () => {
    const { privateKey, publicKey } = await generateKeyPair("RS256");
    const publicJwk = await exportJWK(publicKey);
    const token = await new SignJWT({
      role: "authenticated",
      is_anonymous: true,
    })
      .setProtectedHeader({ alg: "RS256", kid: "supabase-test-key", typ: "JWT" })
      .setSubject(ANON_UUID)
      .setIssuer(SUPABASE_ISSUER)
      .setAudience("authenticated")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(privateKey);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          keys: [{ ...publicJwk, alg: "RS256", kid: "supabase-test-key" }],
        }),
      ),
    );
    await expect(verifySupabaseJwt(token, rsConfig())).resolves.toEqual({
      userId: ANON_UUID,
      roles: [],
      provider: "supabase",
      isAnonymous: true,
    });
  });

  it("accepts a permanent canonical UUID identity", async () => {
    const { privateKey, publicKey } = await generateKeyPair("RS256");
    const publicJwk = await exportJWK(publicKey);
    const token = await signSupabaseRs(privateKey, {
      sub: SUPABASE_UUID,
      role: "authenticated",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          keys: [{ ...publicJwk, alg: "RS256", kid: "supabase-test-key" }],
        }),
      ),
    );
    const identity = await verifySupabaseJwt(token, rsConfig());
    expect(identity).toEqual({
      userId: SUPABASE_UUID,
      roles: [],
      provider: "supabase",
      isAnonymous: false,
    });
  });

  it("rejects a forged token signed by an untrusted key", async () => {
    const { privateKey: trustedPrivate, publicKey: trustedPublic } =
      await generateKeyPair("RS256");
    const trustedJwk = await exportJWK(trustedPublic);
    const { privateKey: attackerPrivate } = await generateKeyPair("RS256");
    const token = await signSupabaseRs(attackerPrivate, { sub: SUPABASE_UUID });
    void trustedPrivate;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          keys: [{ ...trustedJwk, alg: "RS256", kid: "supabase-test-key" }],
        }),
      ),
    );
    await expect(verifySupabaseJwt(token, rsConfig())).rejects.toThrow();
  });

  it("rejects wrong issuer without trusting decoded claims", async () => {
    const { privateKey, publicKey } = await generateKeyPair("RS256");
    const publicJwk = await exportJWK(publicKey);
    const token = await new SignJWT({ role: "authenticated" })
      .setProtectedHeader({ alg: "RS256", kid: "supabase-test-key" })
      .setSubject(SUPABASE_UUID)
      .setIssuer("https://attacker.supabase.co/auth/v1")
      .setAudience("authenticated")
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(privateKey);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          keys: [{ ...publicJwk, alg: "RS256", kid: "supabase-test-key" }],
        }),
      ),
    );
    await expect(verifySupabaseJwt(token, rsConfig())).rejects.toThrow();
  });

  it("rejects wrong audience", async () => {
    const { privateKey, publicKey } = await generateKeyPair("RS256");
    const publicJwk = await exportJWK(publicKey);
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "RS256", kid: "supabase-test-key" })
      .setSubject(SUPABASE_UUID)
      .setIssuer(SUPABASE_ISSUER)
      .setAudience("service_role")
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(privateKey);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          keys: [{ ...publicJwk, alg: "RS256", kid: "supabase-test-key" }],
        }),
      ),
    );
    await expect(verifySupabaseJwt(token, rsConfig())).rejects.toThrow();
  });

  it("rejects expired tokens", async () => {
    const { privateKey, publicKey } = await generateKeyPair("RS256");
    const publicJwk = await exportJWK(publicKey);
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "RS256", kid: "supabase-test-key" })
      .setSubject(SUPABASE_UUID)
      .setIssuer(SUPABASE_ISSUER)
      .setAudience("authenticated")
      .setIssuedAt("2h ago")
      .setExpirationTime("1h ago")
      .sign(privateKey);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          keys: [{ ...publicJwk, alg: "RS256", kid: "supabase-test-key" }],
        }),
      ),
    );
    await expect(verifySupabaseJwt(token, rsConfig())).rejects.toThrow();
  });

  it("rejects disallowed algorithms and never confuses HS256 with JWKS", async () => {
    const secret = new TextEncoder().encode("legacy-secret-for-test-only");
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setSubject(SUPABASE_UUID)
      .setIssuer(SUPABASE_ISSUER)
      .setAudience("authenticated")
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(secret);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ keys: [] })),
    );
    // RS mode must reject HS256 even though the secret would verify.
    await expect(verifySupabaseJwt(token, rsConfig())).rejects.toThrow(
      /not allowed|mismatch/i,
    );
  });

  it("rejects non-UUID subjects to enforce canonical identity", async () => {
    const { privateKey, publicKey } = await generateKeyPair("RS256");
    const publicJwk = await exportJWK(publicKey);
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "RS256", kid: "supabase-test-key" })
      .setSubject("user_123")
      .setIssuer(SUPABASE_ISSUER)
      .setAudience("authenticated")
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(privateKey);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          keys: [{ ...publicJwk, alg: "RS256", kid: "supabase-test-key" }],
        }),
      ),
    );
    await expect(verifySupabaseJwt(token, rsConfig())).rejects.toThrow(
      /canonical UUID/i,
    );
  });
});

describe("verifySupabaseJwt (legacy HS256)", () => {
  const hsConfig: SupabaseJwtConfig = {
    issuer: SUPABASE_ISSUER,
    jwksUrl: SUPABASE_JWKS_URL,
    audience: "authenticated",
    algorithms: ["HS256"],
    jwtSecret: "legacy-secret-for-test-only",
  };

  it("accepts HS256 only with the explicitly configured secret", async () => {
    const key = new TextEncoder().encode("legacy-secret-for-test-only");
    const token = await new SignJWT({ is_anonymous: false })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setSubject(SUPABASE_UUID)
      .setIssuer(SUPABASE_ISSUER)
      .setAudience("authenticated")
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(key);
    const fetchSpy = vi.fn(async () => Response.json({ keys: [] }));
    vi.stubGlobal("fetch", fetchSpy);
    await expect(verifySupabaseJwt(token, hsConfig)).resolves.toMatchObject({
      userId: SUPABASE_UUID,
      provider: "supabase",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects RS256 tokens in HS256 mode (no alg confusion)", async () => {
    const { privateKey, publicKey } = await generateKeyPair("RS256");
    const publicJwk = await exportJWK(publicKey);
    void publicJwk;
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "RS256", kid: "k1" })
      .setSubject(SUPABASE_UUID)
      .setIssuer(SUPABASE_ISSUER)
      .setAudience("authenticated")
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(privateKey);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ keys: [] })),
    );
    await expect(verifySupabaseJwt(token, hsConfig)).rejects.toThrow();
  });
});

describe("verifyAuthToken dispatch", () => {
  it("dispatches by explicit issuer with no verification-failure fallback", async () => {
    const { privateKey: supPrivate, publicKey: supPublic } =
      await generateKeyPair("RS256");
    const supJwk = await exportJWK(supPublic);
    const { privateKey: clerkPrivate, publicKey: clerkPublic } =
      await generateKeyPair("RS256");
    const clerkJwk = await exportJWK(clerkPublic);
    const clerkIssuer = "https://example.clerk.accounts.dev";
    const supToken = await new SignJWT({})
      .setProtectedHeader({ alg: "RS256", kid: "sup-key" })
      .setSubject(SUPABASE_UUID)
      .setIssuer(SUPABASE_ISSUER)
      .setAudience("authenticated")
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(supPrivate);
    const clerkToken = await new SignJWT({})
      .setProtectedHeader({ alg: "RS256", kid: "clerk-key" })
      .setSubject("user_123")
      .setIssuer(clerkIssuer)
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(clerkPrivate);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: unknown) => {
        if (String(url).includes("supabase")) {
          return Response.json({
            keys: [{ ...supJwk, alg: "RS256", kid: "sup-key" }],
          });
        }
        return Response.json({
          keys: [{ ...clerkJwk, alg: "RS256", kid: "clerk-key" }],
        });
      }),
    );
    const env = {
      supabaseUrl: SUPABASE_URL,
      supabaseJwksUrl: SUPABASE_JWKS_URL,
      supabaseJwtSecret: undefined,
      supabaseJwtAlgorithms: undefined,
      clerkSecretKey: "sk_test_example",
      clerkIssuer,
    };
    await expect(verifyAuthToken(supToken, env)).resolves.toMatchObject({
      userId: SUPABASE_UUID,
      provider: "supabase",
    });
    await expect(verifyAuthToken(clerkToken, env)).resolves.toMatchObject({
      userId: "user_123",
      provider: "clerk",
    });
    // Unknown issuer never falls back to the other provider.
    const { privateKey: otherPrivate } = await generateKeyPair("RS256");
    const unknownToken = await new SignJWT({})
      .setProtectedHeader({ alg: "RS256", kid: "sup-key" })
      .setSubject(SUPABASE_UUID)
      .setIssuer("https://unknown.example/auth/v1")
      .setAudience("authenticated")
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(otherPrivate);
    await expect(verifyAuthToken(unknownToken, env)).rejects.toThrow(
      /issuer/i,
    );
  });
});
