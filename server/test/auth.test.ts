import {
  exportJWK,
  generateKeyPair,
  SignJWT,
} from "jose";
import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyClerkJwt } from "../src/auth.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

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
});
