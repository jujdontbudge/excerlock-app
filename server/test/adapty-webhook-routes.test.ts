import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseEnv } from "../src/env.js";
import { createAdaptyWebhookRoutes } from "../src/routes/adaptyWebhook.js";
import type { AdaptyWebhookService } from "../src/subscriptions/index.js";

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe("Adapty webhook route", () => {
  it("rejects missing or incorrect authorization without dispatching", async () => {
    const record = vi.fn();
    await register(record);

    const missing = await app!.inject({
      method: "POST",
      url: "/v1/webhooks/adapty",
      payload: event,
    });
    const incorrect = await app!.inject({
      method: "POST",
      url: "/v1/webhooks/adapty",
      headers: { authorization: "wrong" },
      payload: event,
    });

    expect([missing.statusCode, incorrect.statusCode]).toEqual([401, 401]);
    expect(record).not.toHaveBeenCalled();
  });

  it("answers verification and dispatches subscription events", async () => {
    const record = vi.fn(async () => ({ recorded: true }));
    await register(record);

    const verification = await app!.inject({
      method: "POST",
      url: "/v1/webhooks/adapty",
      headers: { authorization: "webhook-secret" },
      payload: {},
    });
    const delivery = await app!.inject({
      method: "POST",
      url: "/v1/webhooks/adapty",
      headers: { authorization: "webhook-secret" },
      payload: event,
    });

    expect({
      verification: {
        status: verification.statusCode,
        body: verification.json(),
      },
      delivery: { status: delivery.statusCode, body: delivery.json() },
      calls: record.mock.calls,
    }).toEqual({
      verification: { status: 200, body: {} },
      delivery: {
        status: 200,
        body: { accepted: true, recorded: true },
      },
      calls: [[event]],
    });
  });
});

async function register(record: ReturnType<typeof vi.fn>): Promise<void> {
  const service: AdaptyWebhookService = { record };
  app = Fastify({ logger: false });
  await app.register(
    createAdaptyWebhookRoutes({
      environment: parseEnv({ ADAPTY_WEBHOOK_SECRET: "webhook-secret" }),
      service,
    }),
    { prefix: "/v1" },
  );
}

const event = {
  customer_user_id: "user_123",
  event_type: "subscription_refunded",
  event_datetime: "2026-08-31T20:00:00.000Z",
  event_properties: {
    profile_event_id: "refund-event-id",
    profile_has_access_level: false,
  },
};
