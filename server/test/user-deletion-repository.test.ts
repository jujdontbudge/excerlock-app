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
  earnedUnlocks,
  historyDays,
  profiles,
  ruleDays,
  rules,
  supportRequests,
  usageDays,
  users,
} from "../src/db/schema.js";
import { createDrizzleUserDeletionRepository } from "../src/userDeletion/index.js";
import { createPgliteTestDatabase } from "./pgliteTestDatabase.js";

let postgres: Awaited<ReturnType<typeof createPgliteTestDatabase>>;

const OTHER_RULE_ID = "22222222-2222-4222-8222-222222222222";
const USER_RULE_ID = "11111111-1111-4111-8111-111111111111";

beforeAll(async () => {
  postgres = await createPgliteTestDatabase();
});

beforeEach(async () => {
  await postgres.reset();
});

afterAll(async () => {
  await postgres.client.close();
});

describe("account deletion persistence", () => {
  it("erases the user's synced content while retaining an anonymized tombstone", async () => {
    await seedIdentitySpine();
    const repository = createDrizzleUserDeletionRepository(postgres.db);
    const deletedAt = new Date("2026-07-31T20:00:00.000Z");

    const first = await repository.prepareDeletion("user_123", deletedAt);
    const retry = await repository.prepareDeletion(
      "user_123",
      new Date("2026-08-01T20:00:00.000Z"),
    );

    const [deletedUser] = await postgres.db
      .select()
      .from(users)
      .where(eq(users.id, "user_123"));

    expect({
      first,
      retry,
      deletedUser,
      remainingSupport: await postgres.db.select().from(supportRequests),
      remainingRules: await postgres.db.select({ id: rules.id }).from(rules),
      remainingRuleDays: await postgres.db
        .select({ userId: ruleDays.userId })
        .from(ruleDays),
      remainingUsageDays: await postgres.db
        .select({ userId: usageDays.userId })
        .from(usageDays),
      remainingEarnedUnlocks: await postgres.db
        .select({ userId: earnedUnlocks.userId })
        .from(earnedUnlocks),
      remainingHistoryDays: await postgres.db
        .select({ userId: historyDays.userId })
        .from(historyDays),
      remainingProfiles: await postgres.db
        .select({ userId: profiles.userId })
        .from(profiles),
      adaptyState: await postgres.db.select().from(adaptySubscriptionStates),
      adaptyWebhook: await postgres.db.select().from(adaptyWebhookEvents),
    }).toEqual({
      first: {
        deletedAt,
        adaptyErasedAt: null,
        posthogErasedAt: null,
        authDeletedAt: null,
      },
      retry: {
        deletedAt,
        adaptyErasedAt: null,
        posthogErasedAt: null,
        authDeletedAt: null,
      },
      deletedUser: {
        id: "user_123",
        email: null,
        createdAt: new Date("2026-07-30T20:00:00.000Z"),
        updatedAt: deletedAt,
        deletedAt,
        adaptyErasedAt: null,
        posthogErasedAt: null,
        authDeletedAt: null,
      },
      remainingSupport: [expect.objectContaining({ id: "other-support" })],
      remainingRules: [{ id: OTHER_RULE_ID }],
      remainingRuleDays: [{ userId: "other_user" }],
      remainingUsageDays: [{ userId: "other_user" }],
      remainingEarnedUnlocks: [{ userId: "other_user" }],
      remainingHistoryDays: [{ userId: "other_user" }],
      remainingProfiles: [{ userId: "other_user" }],
      adaptyState: [],
      adaptyWebhook: [
        expect.objectContaining({
          deliveryKey: "adapty-delivery-key",
          userId: null,
          eventType: "subscription_started",
        }),
      ],
    });
  });

  it("checkpoints each processor independently so a retry never repeats one", async () => {
    await seedIdentitySpine();
    const repository = createDrizzleUserDeletionRepository(postgres.db);
    const deletedAt = new Date("2026-07-31T20:00:00.000Z");
    const erasedAt = new Date("2026-07-31T20:00:05.000Z");

    await repository.prepareDeletion("user_123", deletedAt);
    await repository.markAdaptyErased("user_123", erasedAt);
    await repository.markPosthogErased("user_123", erasedAt);

    const beforeAuth = await repository.prepareDeletion("user_123", deletedAt);
    await repository.markAuthDeleted("user_123", erasedAt);
    const afterAuth = await repository.prepareDeletion("user_123", deletedAt);

    expect({ beforeAuth, afterAuth }).toEqual({
      beforeAuth: {
        deletedAt,
        adaptyErasedAt: erasedAt,
        posthogErasedAt: erasedAt,
        authDeletedAt: null,
      },
      afterAuth: {
        deletedAt,
        adaptyErasedAt: erasedAt,
        posthogErasedAt: erasedAt,
        authDeletedAt: erasedAt,
      },
    });
  });
});

async function seedIdentitySpine(): Promise<void> {
  const createdAt = new Date("2026-07-30T20:00:00.000Z");
  await postgres.db.insert(users).values([
    { id: "user_123", email: "person@example.com", createdAt, updatedAt: createdAt },
    { id: "other_user", email: "other@example.com", createdAt, updatedAt: createdAt },
  ]);
  await postgres.db.insert(supportRequests).values([
    {
      id: "user-support",
      userId: "user_123",
      category: "feature",
      title: "Private request",
      message: "Delete this only copy.",
    },
    {
      id: "other-support",
      userId: "other_user",
      category: "feature",
      title: "Retained request",
      message: "Keep another user's content.",
    },
  ]);
  await postgres.db.insert(rules).values([
    {
      id: USER_RULE_ID,
      userId: "user_123",
      activity: "walking",
      mode: { kind: "target", activity: "walking", metric: "steps", goal: 5_000, place: "outside" },
      schedule: { days: [1, 2, 3, 4, 5], window: { kind: "allDay" } },
      enabled: true,
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: OTHER_RULE_ID,
      userId: "other_user",
      activity: "gym",
      mode: { kind: "event", activity: "gym", trigger: "arrival" },
      schedule: { days: [0, 6], window: { kind: "allDay" } },
      enabled: true,
      createdAt,
      updatedAt: createdAt,
    },
  ]);
  await postgres.db.insert(ruleDays).values([
    {
      userId: "user_123",
      ruleId: USER_RULE_ID,
      day: "2026-07-30",
      progress: "5200",
      met: true,
      metAt: createdAt,
      updatedAt: createdAt,
    },
    {
      userId: "other_user",
      ruleId: OTHER_RULE_ID,
      day: "2026-07-30",
      progress: "1",
      met: true,
      metAt: createdAt,
      updatedAt: createdAt,
    },
  ]);
  await postgres.db.insert(usageDays).values([
    { userId: "user_123", day: "2026-07-30", lockedAppMinutes: 42, updatedAt: createdAt },
    { userId: "other_user", day: "2026-07-30", lockedAppMinutes: 10, updatedAt: createdAt },
  ]);
  await postgres.db.insert(earnedUnlocks).values([
    {
      userId: "user_123",
      day: "2026-07-30",
      ruleId: USER_RULE_ID,
      ruleName: "5,000 steps",
      metAt: createdAt,
      windowEnd: createdAt,
      updatedAt: createdAt,
    },
    {
      userId: "other_user",
      day: "2026-07-30",
      ruleId: OTHER_RULE_ID,
      ruleName: "Arrive at the gym",
      metAt: createdAt,
      windowEnd: createdAt,
      updatedAt: createdAt,
    },
  ]);
  await postgres.db.insert(historyDays).values([
    {
      userId: "user_123",
      day: "2026-07-30",
      usageMinutes: 42,
      activity: { walking: 5200, gym: 0, running: 0, biking: 0 },
      met: true,
      scheduled: true,
      sealedAt: createdAt,
      updatedAt: createdAt,
    },
    {
      userId: "other_user",
      day: "2026-07-30",
      usageMinutes: 10,
      activity: { walking: 0, gym: 30, running: 0, biking: 0 },
      met: true,
      scheduled: true,
      sealedAt: createdAt,
      updatedAt: createdAt,
    },
  ]);
  await postgres.db.insert(profiles).values([
    { userId: "user_123", name: "Person", estimatedDailyMinutes: 180, units: "mi", updatedAt: createdAt },
    { userId: "other_user", name: "Other", estimatedDailyMinutes: 90, units: "km", updatedAt: createdAt },
  ]);
  await postgres.db.insert(adaptySubscriptionStates).values({
    userId: "user_123",
    hasAccess: true,
    eventType: "subscription_started",
    eventOccurredAt: createdAt,
  });
  await postgres.db.insert(adaptyWebhookEvents).values({
    deliveryKey: "adapty-delivery-key",
    userId: "user_123",
    eventType: "subscription_started",
  });
}
