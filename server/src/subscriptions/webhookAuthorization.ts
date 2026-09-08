import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Constant-time comparison of the Adapty webhook's shared-secret Authorization
 * header. Hashing first keeps the comparison length-independent, so a mismatch
 * cannot be timed for the secret's length.
 */
export function verifyWebhookAuthorization(
  received: string,
  expected: string,
): boolean {
  const receivedDigest = createHash("sha256").update(received).digest();
  const expectedDigest = createHash("sha256").update(expected).digest();
  return timingSafeEqual(receivedDigest, expectedDigest);
}
