import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseEnv } from "../src/env.js";
import { createVendorWebhookRoutes } from "../src/routes/vendors.js";
import type { Vendor } from "../src/vendors/index.js";
import type { VendorWebhookService } from "../src/webhooks/index.js";

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

const environment = parseEnv({
  STRAVA_CLIENT_ID: "strava-id",
  STRAVA_CLIENT_SECRET: "strava-secret",
  STRAVA_WEBHOOK_VERIFY_TOKEN: "strava-verify-token",
  STRAVA_WEBHOOK_SUBSCRIPTION_ID: "120475",
  OURA_CLIENT_ID: "oura-id",
  OURA_CLIENT_SECRET: "oura-secret",
  OURA_WEBHOOK_VERIFY_TOKEN: "oura-verify-token",
  WHOOP_CLIENT_ID: "whoop-id",
  WHOOP_CLIENT_SECRET: "whoop-secret",
  POLAR_CLIENT_ID: "polar-id",
  POLAR_CLIENT_SECRET: "polar-secret",
  POLAR_WEBHOOK_SIGNATURE_SECRET: "polar-signature-secret",
});

const deliveries = [
  {
    vendor: "strava",
    rawPayload: '{"subscription_id":120475}',
    headers: {},
  },
  {
    vendor: "oura",
    rawPayload:
      '{"event_type":"update","user_id":"user-1","object_id":"obj-1"}',
    headers: {
      "x-oura-timestamp": "1785351600000",
      "x-oura-signature":
        "E0CDA851E5C12F48A20A43EE3BFB86E5D7E4313F3A321C6C87FF649536ED0EC8",
    },
  },
  {
    vendor: "whoop",
    rawPayload:
      '{"event_type":"update","user_id":"user-1","object_id":"obj-1"}',
    headers: {
      "x-whoop-signature-timestamp": "1785351600000",
      "x-whoop-signature":
        "upVxCBi9vPzY/ch19As5keqUP+0vUHO+ubkDckfXtnk=",
    },
  },
  {
    vendor: "polar",
    rawPayload:
      '{"event_type":"update","user_id":"user-1","object_id":"obj-1"}',
    headers: {
      "polar-webhook-signature":
        "fbb5cf3ee674c0c28421360dfa0c0f69f15512ea059005b72c236c1eff5d57bb",
    },
  },
] as const satisfies readonly {
  vendor: Vendor;
  rawPayload: string;
  headers: Readonly<Record<string, string>>;
}[];

describe("vendor webhook routes", () => {
  it("answers Strava and Oura subscription challenges", async () => {
    const service: VendorWebhookService = {
      recordVerified: vi.fn(),
    };
    app = Fastify({ logger: false });
    await app.register(
      createVendorWebhookRoutes({ environment, service }),
      { prefix: "/v1" },
    );

    const strava = await app.inject({
      method: "GET",
      url: "/v1/vendors/strava/webhook?hub.mode=subscribe&hub.challenge=strava-challenge&hub.verify_token=strava-verify-token",
    });
    const oura = await app.inject({
      method: "GET",
      url: "/v1/vendors/oura/webhook?challenge=oura-challenge&verification_token=oura-verify-token",
    });

    expect({
      strava: { status: strava.statusCode, body: strava.json() },
      oura: { status: oura.statusCode, body: oura.json() },
    }).toEqual({
      strava: {
        status: 200,
        body: { "hub.challenge": "strava-challenge" },
      },
      oura: {
        status: 200,
        body: { challenge: "oura-challenge" },
      },
    });
  });

  it.each(deliveries)(
    "verifies and dispatches the exact raw $vendor body",
    async ({ vendor, rawPayload, headers }) => {
      const recordVerified = vi.fn(async () => ({
        recorded: true,
        eventId: "event-id",
      }));
      const service: VendorWebhookService = { recordVerified };
      app = Fastify({ logger: false });
      await app.register(
        createVendorWebhookRoutes({ environment, service }),
        { prefix: "/v1" },
      );

      const response = await app.inject({
        method: "POST",
        url: `/v1/vendors/${vendor}/webhook`,
        headers: {
          "content-type": "application/json",
          ...headers,
        },
        payload: rawPayload,
      });

      expect({
        status: response.statusCode,
        body: response.json(),
        calls: recordVerified.mock.calls,
      }).toEqual({
        status: 200,
        body: {
          accepted: true,
          recorded: true,
          eventId: "event-id",
        },
        calls: [[vendor, rawPayload]],
      });
    },
  );
});
