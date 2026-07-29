import { describe, expect, it } from "vitest";
import {
  verifyOuraWebhook,
  verifyPolarWebhook,
  verifyStravaChallenge,
  verifyStravaSubscription,
  verifyWhoopWebhook,
} from "../src/webhooks/index.js";

const rawBody =
  '{"event_type":"update","user_id":"user-1","object_id":"obj-1"}';
const timestamp = "1785351600000";

describe("vendor webhook verification", () => {
  it("accepts and rejects Strava's challenge and subscription identifiers", () => {
    expect(
      verifyStravaChallenge("configured-token", "configured-token"),
    ).toBe(true);
    expect(
      verifyStravaChallenge("forged-token", "configured-token"),
    ).toBe(false);
    expect(
      verifyStravaSubscription({ subscription_id: 120475 }, "120475"),
    ).toBe(true);
    expect(
      verifyStravaSubscription({ subscription_id: 999999 }, "120475"),
    ).toBe(false);
  });

  it("accepts and rejects Oura's timestamp-plus-body hex HMAC", () => {
    expect(
      verifyOuraWebhook({
        rawBody,
        timestamp,
        signature:
          "E0CDA851E5C12F48A20A43EE3BFB86E5D7E4313F3A321C6C87FF649536ED0EC8",
        clientSecret: "oura-secret",
      }),
    ).toBe(true);
    expect(
      verifyOuraWebhook({
        rawBody,
        timestamp,
        signature: "00",
        clientSecret: "oura-secret",
      }),
    ).toBe(false);
  });

  it("accepts and rejects WHOOP's timestamp-plus-body base64 HMAC", () => {
    expect(
      verifyWhoopWebhook({
        rawBody,
        timestamp,
        signature: "upVxCBi9vPzY/ch19As5keqUP+0vUHO+ubkDckfXtnk=",
        clientSecret: "whoop-secret",
      }),
    ).toBe(true);
    expect(
      verifyWhoopWebhook({
        rawBody,
        timestamp,
        signature: "forged",
        clientSecret: "whoop-secret",
      }),
    ).toBe(false);
  });

  it("accepts and rejects Polar's raw-body hex HMAC", () => {
    expect(
      verifyPolarWebhook({
        rawBody,
        signature:
          "fbb5cf3ee674c0c28421360dfa0c0f69f15512ea059005b72c236c1eff5d57bb",
        signatureSecret: "polar-signature-secret",
      }),
    ).toBe(true);
    expect(
      verifyPolarWebhook({
        rawBody,
        signature: "forged",
        signatureSecret: "polar-signature-secret",
      }),
    ).toBe(false);
  });
});
