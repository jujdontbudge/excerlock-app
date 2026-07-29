import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createTokenCipher } from "../src/vendors/index.js";

describe("vendor token encryption", () => {
  it("round-trips a token without exposing plaintext and authenticates the key", () => {
    const cipher = createTokenCipher(randomBytes(32));
    const encrypted = cipher.encrypt("refresh-token-secret");

    expect(encrypted).not.toContain("refresh-token-secret");
    expect(cipher.decrypt(encrypted)).toBe("refresh-token-secret");

    const differentCipher = createTokenCipher(randomBytes(32));
    expect(() => differentCipher.decrypt(encrypted)).toThrow(
      "Unable to decrypt vendor token",
    );
  });
});
