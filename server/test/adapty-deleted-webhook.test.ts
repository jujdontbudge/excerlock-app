import { eq } from "drizzle-orm";
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
import { createDrizzleUserDeletionRepository } from "../src/userDeletion/index.js";
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
}, 30_000);

afterAll(async () => {
  await postgres.client.close();
}, 30_000);

describe("late Adapty webhooks after account deletion", () => {
  it("mirrors access for an active account without retaining the payload", async () => {
    await postgres.db.insert(users).values({ id: "user_123" });
    const service = createAdaptyWebhookService(
      createDrizzleAdaptyWebhookRepository(postgres.db),
      () => new Date("2026-07-31T20:00:00.000Z"),
    );

    expect(
      await service.record(
        adaptyEvent("start-event-id", "subscription_started", true),
      ),
    ).toEqual({ recorded: true });

    expect(await postgres.db.select().from(adaptySubscriptionStates)).toEqual([
      expect.objectContaining({
        userId: "user_123",
        hasAccess: true,
        eventType: "access_level_updated",
        environment: "production",
        eventOccurredAt: new Date("2026-08-31T20:00:00.000Z"),
        expiresAt: new Date("2026-09-30T20:00:00.000Z"),
        updatedAt: new Date("2026-07-31T20:00:00.000Z"),
      }),
    ]);
    expect(await postgres.db.select().from(adaptyWebhookEvents)).toEqual([
      {
        deliveryKey: "start-event-id",
        userId: "user_123",
        eventType: "access_level_updated",
        environment: "production",
        receivedAt: new Date("2026-07-31T20:00:00.000Z"),
      },
    ]);
  });

  it("does not let a delayed older renewal overwrite a newer refund", async () => {
    await postgres.db.insert(users).values({ id: "user_123" });
    let receivedAt = new Date("2026-09-01T20:00:00.000Z");
    const service = createAdaptyWebhookService(
      createDrizzleAdaptyWebhookRepository(postgres.db),
      () => receivedAt,
    );

    await service.record(
      adaptyEvent(
        "refund-event-id",
        "subscription_refunded",
        false,
        "2026-09-01T19:00:00.000000+0000",
      ),
    );
    receivedAt = new Date("2026-09-01T20:05:00.000Z");
    await service.record(
      adaptyEvent(
        "renewal-event-id",
        "subscription_renewed",
        true,
        "2026-08-01T19:00:00.000000+0000",
      ),
    );

    expect(await postgres.db.select().from(adaptySubscriptionStates)).toEqual([
      expect.objectContaining({
        hasAccess: false,
        eventType: "access_level_updated",
      }),
    ]);
  });

  it("acknowledges renewal and refund retries without resurrecting the user", async () => {
    await postgres.db.insert(users).values({
      id: "user_123",
      email: "person@example.com",
    });
    await createDrizzleUserDeletionRepository(postgres.db).prepareDeletion(
      "user_123",
      new Date("2026-07-31T20:00:00.000Z"),
    );
    const service = createAdaptyWebhookService(
      createDrizzleAdaptyWebhookRepository(postgres.db),
    );

    const renewal = adaptyEvent(
      "renewal-event-id",
      "subscription_renewed",
      true,
    );
    const refund = adaptyEvent(
      "refund-event-id",
      "subscription_refunded",
      false,
    );

    expect(await service.record(renewal)).toEqual({ recorded: true });
    expect(await service.record(refund)).toEqual({ recorded: true });
    expect(await service.record(renewal)).toEqual({ recorded: false });

    expect(
      await postgres.db
        .select()
        .from(users)
        .where(eq(users.id, "user_123")),
    ).toEqual([
      expect.objectContaining({
        id: "user_123",
        email: null,
        deletedAt: new Date("2026-07-31T20:00:00.000Z"),
      }),
    ]);
    expect(await postgres.db.select().from(adaptyWebhookEvents)).toEqual([
      expect.objectContaining({
        deliveryKey: "renewal-event-id",
        userId: null,
        eventType: "access_level_updated",
      }),
      expect.objectContaining({
        deliveryKey: "refund-event-id",
        userId: null,
        eventType: "access_level_updated",
      }),
    ]);
  });
});

function adaptyEvent(
  profileEventId: string,
  eventType: string,
  hasAccess: boolean,
  eventDatetime = "2026-08-31T20:00:00.000Z",
) {
  return {
    customer_user_id: "user_123",
    event_type: "access_level_updated",
    event_datetime: eventDatetime,
    event_properties: {
      profile_event_id: profileEventId,
      access_level_id: "premium",
      is_active: hasAccess,
      is_in_grace_period: false,
      environment: "Production",
      expires_at: "2026-09-30T20:00:00.000000+0000",
    },
  };
}
