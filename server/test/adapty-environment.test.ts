import { ZodError } from "zod";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import {
  adaptySubscriptionStates,
  adaptyWebhookEvents,
  users,
} from "../src/db/schema.js";
import {
  createAdaptyWebhookService,
  createDrizzleAdaptyWebhookRepository,
} from "../src/subscriptions/index.js";
import { createPgliteTestDatabase } from "./pgliteTestDatabase.js";

let postgres: Awaited<ReturnType<typeof createPgliteTestDatabase>>;

beforeAll(async () => {
  postgres = await createPgliteTestDatabase();
});

beforeEach(async () => {
  await postgres.reset();
  await postgres.db.insert(users).values({ id: "user_123" });
});

afterAll(async () => {
  await postgres.client.close();
});

describe("sandbox and production purchases stay distinguishable", () => {
  it("stamps the ledger row and the access mirror with the store environment", async () => {
    const service = createAdaptyWebhookService(
      createDrizzleAdaptyWebhookRepository(postgres.db),
    );

    await service.record(adaptyEvent("sandbox-event-id", "Sandbox"));

    expect(await postgres.db.select().from(adaptyWebhookEvents)).toEqual([
      expect.objectContaining({
        deliveryKey: "sandbox-event-id",
        environment: "sandbox",
      }),
    ]);
    expect(await postgres.db.select().from(adaptySubscriptionStates)).toEqual([
      expect.objectContaining({
        userId: "user_123",
        environment: "sandbox",
      }),
    ]);
  });

  it("records production events as production", async () => {
    const service = createAdaptyWebhookService(
      createDrizzleAdaptyWebhookRepository(postgres.db),
    );

    await service.record(adaptyEvent("production-event-id", "Production"));

    expect(await postgres.db.select().from(adaptyWebhookEvents)).toEqual([
      expect.objectContaining({ environment: "production" }),
    ]);
    expect(await postgres.db.select().from(adaptySubscriptionStates)).toEqual([
      expect.objectContaining({ environment: "production" }),
    ]);
  });

  it("moves the mirror to production when a tester becomes a paying customer", async () => {
    const service = createAdaptyWebhookService(
      createDrizzleAdaptyWebhookRepository(postgres.db),
    );

    await service.record(
      adaptyEvent("sandbox-event-id", "Sandbox", "2026-08-01T20:00:00.000Z"),
    );
    await service.record(
      adaptyEvent(
        "production-event-id",
        "Production",
        "2026-08-02T20:00:00.000Z",
      ),
    );

    expect(await postgres.db.select().from(adaptySubscriptionStates)).toEqual([
      expect.objectContaining({ environment: "production" }),
    ]);
  });

  it("rejects an event that does not say which store it came from", async () => {
    const service = createAdaptyWebhookService(
      createDrizzleAdaptyWebhookRepository(postgres.db),
    );
    const event = adaptyEvent("missing-environment-id", "Production");
    delete (event.event_properties as Record<string, unknown>).environment;

    await expect(service.record(event)).rejects.toThrow(ZodError);
    expect(await postgres.db.select().from(adaptyWebhookEvents)).toEqual([]);
  });
});

function adaptyEvent(
  profileEventId: string,
  environment: string,
  eventDatetime = "2026-08-31T20:00:00.000Z",
) {
  return {
    customer_user_id: "user_123",
    event_type: "subscription_started",
    event_datetime: eventDatetime,
    event_properties: {
      profile_event_id: profileEventId,
      profile_has_access_level: true,
      subscription_expires_at: "2026-09-30T20:00:00.000000+0000",
      environment,
    },
  };
}
