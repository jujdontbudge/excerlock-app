import {
  exportJWK,
  generateKeyPair,
  SignJWT,
} from "jose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  supabaseVerificationFrom,
  verifySupabaseJwt,
  type SupabaseJwtVerification,
} from "../src/auth.js";
import { parseEnv } from "../src/env.js";

const PROJECT_URL = "https://hqgqhefftjxwdhqeushr.supabase.co";
const ISSUER = `${PROJECT_URL}/auth/v1`;
const DERIVED_JWKS_URL = `${ISSUER}/.well-known/jwks.json`;

let privateKey: CryptoKey;
let jwks: { keys: unknown[] };
/**
 * The key set is cached per url for the life of the process, exactly as it is
 * in production. Each test therefore mints its own key pair against its own
 * url so one test's cache entry can never verify another test's token.
 */
let jwksUrl: string;
let jwksSerial = 0;

/**
 * Supabase signs project access tokens with ES256 by default now, so the suite
 * mints real ES256 tokens against a stubbed JWKS rather than trusting a decode.
 */
beforeEach(async () => {
  jwksSerial += 1;
  jwksUrl = `${ISSUER}/.well-known/jwks.json?key-set=${jwksSerial}`;
  const pair = await generateKeyPair("ES256", { extractable: true });
  privateKey = pair.privateKey;
  const publicJwk = await exportJWK(pair.publicKey);
  jwks = {
    keys: [
      { ...publicJwk, alg: "ES256", kid: "supabase-test-key", use: "sig" },
    ],
  };
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubJwks(): ReturnType<typeof vi.fn> {
  const fetchSpy = vi.fn(async () => Response.json(jwks));
  vi.stubGlobal("fetch", fetchSpy);
  return fetchSpy;
}

interface TokenOverrides {
  readonly subject?: string;
  readonly issuer?: string;
  readonly audience?: string;
  readonly expiresIn?: string;
  readonly isAnonymous?: boolean;
}

async function mintToken(overrides: TokenOverrides = {}): Promise<string> {
  const claims =
    overrides.isAnonymous === undefined
      ? {}
      : { is_anonymous: overrides.isAnonymous };

  return new SignJWT({ role: "authenticated", ...claims })
    .setProtectedHeader({ alg: "ES256", kid: "supabase-test-key", typ: "JWT" })
    .setSubject(overrides.subject ?? "8f0c1d2e-1111-4222-8333-444455556666")
    .setIssuer(overrides.issuer ?? ISSUER)
    .setAudience(overrides.audience ?? "authenticated")
    .setIssuedAt()
    .setExpirationTime(overrides.expiresIn ?? "5m")
    .sign(privateKey);
}

function jwksVerificationForTest(): SupabaseJwtVerification {
  return { issuer: ISSUER, jwksUrl };
}

describe("verifySupabaseJwt against the project JWKS", () => {
  it("accepts a signed-in access token and reports a non-anonymous identity", async () => {
    stubJwks();
    const token = await mintToken({ isAnonymous: false });

    await expect(verifySupabaseJwt(token, jwksVerificationForTest())).resolves.toEqual({
      userId: "8f0c1d2e-1111-4222-8333-444455556666",
      isAnonymous: false,
    });
  });

  it("reports an anonymous identity when the token carries is_anonymous", async () => {
    stubJwks();
    const token = await mintToken({ isAnonymous: true });

    await expect(verifySupabaseJwt(token, jwksVerificationForTest())).resolves.toEqual({
      userId: "8f0c1d2e-1111-4222-8333-444455556666",
      isAnonymous: true,
    });
  });

  it("treats a token without the claim as non-anonymous", async () => {
    stubJwks();
    const token = await mintToken();

    await expect(verifySupabaseJwt(token, jwksVerificationForTest())).resolves.toEqual({
      userId: "8f0c1d2e-1111-4222-8333-444455556666",
      isAnonymous: false,
    });
  });

  it("caches the key set across verifications", async () => {
    const fetchSpy = stubJwks();
    const token = await mintToken();

    await verifySupabaseJwt(token, jwksVerificationForTest());
    await verifySupabaseJwt(token, jwksVerificationForTest());

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0]?.[0]).toBe(jwksUrl);
  });

  it("rejects an expired token", async () => {
    stubJwks();
    const token = await mintToken({ expiresIn: "-1m" });

    await expect(verifySupabaseJwt(token, jwksVerificationForTest())).rejects.toThrow();
  });

  it("rejects a token minted by a different Supabase project", async () => {
    stubJwks();
    const token = await mintToken({
      issuer: "https://someone-elses-project.supabase.co/auth/v1",
    });

    await expect(verifySupabaseJwt(token, jwksVerificationForTest())).rejects.toThrow();
  });

  it("rejects a token for another audience", async () => {
    stubJwks();
    const token = await mintToken({ audience: "anon" });

    await expect(verifySupabaseJwt(token, jwksVerificationForTest())).rejects.toThrow();
  });

  it("rejects a Clerk-shaped token whose signature is not ours", async () => {
    stubJwks();
    const foreign = await generateKeyPair("RS256", { extractable: true });
    const token = await new SignJWT({ roles: ["member"] })
      .setProtectedHeader({ alg: "RS256", kid: "clerk-test-key", typ: "JWT" })
      .setSubject("user_2abcDEF")
      .setIssuer("https://example.clerk.accounts.dev")
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(foreign.privateKey);

    await expect(verifySupabaseJwt(token, jwksVerificationForTest())).rejects.toThrow();
  });

  it("rejects a token with a blank subject", async () => {
    stubJwks();
    const token = await mintToken({ subject: " " });

    await expect(verifySupabaseJwt(token, jwksVerificationForTest())).rejects.toThrow(
      /subject/i,
    );
  });
});

describe("verifySupabaseJwt with the optional shared secret", () => {
  it("accepts an HS256 token when only the secret is configured", async () => {
    const secret = "a-very-long-legacy-supabase-jwt-secret-value";
    const token = await new SignJWT({ is_anonymous: true })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setSubject("legacy-user")
      .setIssuer(ISSUER)
      .setAudience("authenticated")
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(new TextEncoder().encode(secret));

    await expect(
      verifySupabaseJwt(token, { issuer: ISSUER, sharedSecret: secret }),
    ).resolves.toEqual({ userId: "legacy-user", isAnonymous: true });
  });

  it("never accepts an HS256 token while the JWKS is configured", async () => {
    stubJwks();
    const secret = "a-very-long-legacy-supabase-jwt-secret-value";
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setSubject("legacy-user")
      .setIssuer(ISSUER)
      .setAudience("authenticated")
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(new TextEncoder().encode(secret));

    await expect(
      verifySupabaseJwt(token, {
        issuer: ISSUER,
        jwksUrl,
        sharedSecret: secret,
      }),
    ).rejects.toThrow();
  });
});

describe("supabaseVerificationFrom", () => {
  it("derives the issuer and JWKS url from SUPABASE_URL alone", () => {
    expect(
      supabaseVerificationFrom(parseEnv({ SUPABASE_URL: `${PROJECT_URL}/` })),
    ).toEqual({ issuer: ISSUER, jwksUrl: DERIVED_JWKS_URL });
  });

  it("lets an explicit JWKS url win", () => {
    expect(
      supabaseVerificationFrom(
        parseEnv({
          SUPABASE_URL: PROJECT_URL,
          SUPABASE_JWT_JWKS_URL: "https://example.test/keys.json",
        }),
      ),
    ).toEqual({ issuer: ISSUER, jwksUrl: "https://example.test/keys.json" });
  });

  it("carries the shared secret when one is configured", () => {
    expect(
      supabaseVerificationFrom(
        parseEnv({ SUPABASE_URL: PROJECT_URL, SUPABASE_JWT_SECRET: "shh" }),
      ),
    ).toEqual({
      issuer: ISSUER,
      jwksUrl: DERIVED_JWKS_URL,
      sharedSecret: "shh",
    });
  });

  it("is null when Supabase is not configured at all", () => {
    expect(supabaseVerificationFrom(parseEnv({}))).toBeNull();
  });
});
