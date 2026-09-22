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
}, 30_000);

beforeEach(async () => {
  await postgres.reset();
  await postgres.db.insert(users).values({ id: "user_123" });
}, 30_000);

afterAll(async () => {
  await postgres.client.close();
}, 30_000);

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

  it("keeps sandbox and production in independent partitions", async () => {
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

    expect((await postgres.db.select().from(adaptySubscriptionStates)).map((row) => row.environment).sort()).toEqual(["production", "sandbox"]);
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

  it("acknowledges an authenticated event with no bindable customer id", async () => {
    const service = createAdaptyWebhookService(createDrizzleAdaptyWebhookRepository(postgres.db));
    const event = { customer_user_id: null, event_type: "subscription_renewed", event_datetime: "2026-08-31T20:00:00Z", event_properties: {} };
    await expect(service.record(event)).resolves.toEqual({ recorded: false, unbound: true });
    expect(await postgres.db.select().from(adaptySubscriptionStates)).toEqual([]);
  });

  it("uses delivery key as a deterministic equal-time tie breaker", async () => {
    const service = createAdaptyWebhookService(createDrizzleAdaptyWebhookRepository(postgres.db));
    const laterKey = adaptyEvent("z-event", "Production");
    laterKey.event_properties.is_active = false;
    await service.record(laterKey);
    await service.record(adaptyEvent("a-event", "Production"));
    const [row] = await postgres.db.select().from(adaptySubscriptionStates);
    expect(row?.lastDeliveryKey).toBe("z-event");
    expect(row?.hasAccess).toBe(false);
  });

  it("never lets a newer sandbox lapse overwrite production access", async () => {
    const service = createAdaptyWebhookService(createDrizzleAdaptyWebhookRepository(postgres.db));
    await service.record(adaptyEvent("prod", "Production", "2026-08-01T20:00:00.000Z"));
    const sandbox = adaptyEvent("sandbox", "Sandbox", "2026-09-01T20:00:00.000Z");
    sandbox.event_properties.is_active = false;
    await service.record(sandbox);
    const production = (await postgres.db.select().from(adaptySubscriptionStates)).find((row) => row.environment === "production");
    expect(production?.hasAccess).toBe(true);
  });

  it("deduplicates delivery ids within, not across, store environments", async () => {
    const service = createAdaptyWebhookService(createDrizzleAdaptyWebhookRepository(postgres.db));
    await expect(service.record(adaptyEvent("shared-id", "Production"))).resolves.toEqual({ recorded: true });
    await expect(service.record(adaptyEvent("shared-id", "Sandbox"))).resolves.toEqual({ recorded: true });
    await expect(service.record(adaptyEvent("shared-id", "Production"))).resolves.toEqual({ recorded: false });
    expect(await postgres.db.select().from(adaptyWebhookEvents)).toHaveLength(2);
  });

  it("does not authorize profile-wide lifecycle aggregates or another access level", async () => {
    const service = createAdaptyWebhookService(createDrizzleAdaptyWebhookRepository(postgres.db));
    const lifecycle = {
      customer_user_id: "user_123", event_type: "subscription_started",
      event_datetime: "2026-08-31T20:00:00Z",
      event_properties: { profile_event_id: "lifecycle", environment: "Production", profile_has_access_level: true },
    };
    await expect(service.record(lifecycle)).resolves.toEqual({ recorded: false });
    const other = adaptyEvent("other", "Production");
    other.event_properties.access_level_id = "other";
    await expect(service.record(other)).resolves.toEqual({ recorded: false });
    expect(await postgres.db.select().from(adaptySubscriptionStates)).toEqual([]);
  });

  it("does not grant when grace is true but Adapty says premium is inactive", async () => {
    const service = createAdaptyWebhookService(createDrizzleAdaptyWebhookRepository(postgres.db));
    const event = adaptyEvent("inactive-grace", "Production");
    event.event_properties.is_active = false;
    event.event_properties.is_in_grace_period = true;
    await service.record(event);
    const [row] = await postgres.db.select().from(adaptySubscriptionStates);
    expect(row).toEqual(expect.objectContaining({ hasAccess: false, isInGracePeriod: true }));
  });
});

function adaptyEvent(
  profileEventId: string,
  environment: string,
  eventDatetime = "2026-08-31T20:00:00.000Z",
) {
  return {
    customer_user_id: "user_123",
    event_type: "access_level_updated",
    event_datetime: eventDatetime,
    event_properties: {
      profile_event_id: profileEventId,
      access_level_id: "premium",
      is_active: true,
      is_in_grace_period: false,
      expires_at: "2026-09-30T20:00:00.000000+0000",
      environment,
    },
  };
}
