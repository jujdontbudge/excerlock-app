import { createHmac, timingSafeEqual } from "node:crypto";

interface TimestampedWebhookVerification {
  rawBody: string;
  timestamp: string;
  signature: string;
  clientSecret: string;
}

interface PolarWebhookVerification {
  rawBody: string;
  signature: string;
  signatureSecret: string;
}

function safeEqual(received: string, expected: string): boolean {
  const receivedBytes = Buffer.from(received);
  const expectedBytes = Buffer.from(expected);
  if (receivedBytes.byteLength !== expectedBytes.byteLength) {
    return false;
  }
  return timingSafeEqual(receivedBytes, expectedBytes);
}

export function verifyStravaChallenge(
  receivedToken: string,
  expectedToken: string,
): boolean {
  return safeEqual(receivedToken, expectedToken);
}

export function verifyStravaSubscription(
  payload: Readonly<Record<string, unknown>>,
  expectedSubscriptionId: string,
): boolean {
  const subscriptionId = payload.subscription_id;
  return (
    (typeof subscriptionId === "string" ||
      typeof subscriptionId === "number") &&
    safeEqual(String(subscriptionId), expectedSubscriptionId)
  );
}

export function verifyOuraWebhook(
  input: TimestampedWebhookVerification,
): boolean {
  const expected = createHmac("sha256", input.clientSecret)
    .update(`${input.timestamp}${input.rawBody}`)
    .digest("hex")
    .toUpperCase();
  return safeEqual(input.signature.toUpperCase(), expected);
}

export function verifyWhoopWebhook(
  input: TimestampedWebhookVerification,
): boolean {
  const expected = createHmac("sha256", input.clientSecret)
    .update(`${input.timestamp}${input.rawBody}`)
    .digest("base64");
  return safeEqual(input.signature, expected);
}

export function verifyPolarWebhook(
  input: PolarWebhookVerification,
): boolean {
  const expected = createHmac("sha256", input.signatureSecret)
    .update(input.rawBody)
    .digest("hex");
  return safeEqual(input.signature.toLowerCase(), expected);
}
