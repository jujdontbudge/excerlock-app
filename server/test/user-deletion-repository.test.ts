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
  featureRequestVotes,
  featureRequests,
  supportRequests,
  users,
  vendorConnections,
  vendorOAuthStates,
  vendorWebhookEvents,
} from "../src/db/schema.js";
import { createDrizzleUserDeletionRepository } from "../src/userDeletion/index.js";
import { createDrizzleVendorRepository } from "../src/vendors/index.js";
import { createVendorWebhookService } from "../src/webhooks/index.js";
import { createPgliteTestDatabase } from "./pgliteTestDatabase.js";

let postgres: Awaited<ReturnType<typeof createPgliteTestDatabase>>;

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
  it("atomically erases user content and credentials while retaining an anonymized tombstone", async () => {
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
    const retainedUserContent = await postgres.db
      .select()
      .from(supportRequests)
      .where(eq(supportRequests.userId, "other_user"));
    const retainedWebhook = await postgres.db
      .select()
      .from(vendorWebhookEvents)
      .where(eq(vendorWebhookEvents.userId, "user_123"));

    expect({
      first,
      retry,
      deletedUser,
      deletedSupport: await countRows(supportRequests, supportRequests.userId),
      deletedVotes: await countRows(
        featureRequestVotes,
        featureRequestVotes.userId,
      ),
      deletedConnections: await countRows(
        vendorConnections,
        vendorConnections.userId,
      ),
      deletedOAuthStates: await countRows(
        vendorOAuthStates,
        vendorOAuthStates.userId,
      ),
      retainedUserContent,
      retainedWebhook,
      adaptyState: await postgres.db.select().from(adaptySubscriptionStates),
      adaptyWebhook: await postgres.db.select().from(adaptyWebhookEvents),
    }).toEqual({
      first: {
        deletedAt,
        adaptyErasedAt: null,
        posthogErasedAt: null,
        clerkDeletedAt: null,
        authProvider: null,
        authDeletedAt: null,
        deletionAttempts: 0,
        deletionNextRetryAt: null,
      },
      retry: {
        deletedAt,
        adaptyErasedAt: null,
        posthogErasedAt: null,
        clerkDeletedAt: null,
        authProvider: null,
        authDeletedAt: null,
        deletionAttempts: 0,
        deletionNextRetryAt: null,
      },
      deletedUser: expect.objectContaining({
        id: "user_123",
        email: null,
        createdAt: new Date("2026-07-30T20:00:00.000Z"),
        updatedAt: deletedAt,
        deletedAt,
        adaptyErasedAt: null,
        posthogErasedAt: null,
        clerkDeletedAt: null,
        authProvider: null,
        authDeletedAt: null,
        deletionAttempts: 0,
        deletionNextRetryAt: null,
      }),
      deletedSupport: 0,
      deletedVotes: 0,
      deletedConnections: 0,
      deletedOAuthStates: 0,
      retainedUserContent: [
        expect.objectContaining({ id: "other-support" }),
      ],
      retainedWebhook: [
        expect.objectContaining({
          id: "webhook-event",
          externalUserId: "deleted",
          rawPayload: "{}",
          deliveryKey: "delivery-key",
        }),
      ],
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

  it("acknowledges a late webhook without recreating deleted identity data", async () => {
    await seedIdentitySpine();
    await createDrizzleUserDeletionRepository(postgres.db).prepareDeletion(
      "user_123",
      new Date("2026-07-31T20:00:00.000Z"),
    );
    const service = createVendorWebhookService({
      repository: createDrizzleVendorRepository(postgres.db),
      analytics: {
        vendorDisconnected() {},
        vendorEarnRecorded() {},
      },
    });

    const result = await service.recordVerified(
      "whoop",
      '{"user_id":67890,"id":"550e8400-e29b-41d4-a716-446655440000","type":"workout.updated","trace_id":"late-after-delete"}',
    );

    expect({
      result,
      users: await postgres.db.select().from(users),
      connections: await postgres.db.select().from(vendorConnections),
      events: await postgres.db.select().from(vendorWebhookEvents),
    }).toEqual({
      result: { recorded: false, eventId: null },
      users: expect.arrayContaining([
        expect.objectContaining({ id: "user_123", email: null }),
        expect.objectContaining({ id: "other_user" }),
      ]),
      connections: [],
      events: [
        expect.objectContaining({
          id: "webhook-event",
          externalUserId: "deleted",
          rawPayload: "{}",
          deliveryKey: "delivery-key",
        }),
      ],
    });
  });
});

async function countRows(
  table:
    | typeof supportRequests
    | typeof featureRequestVotes
    | typeof vendorConnections
    | typeof vendorOAuthStates,
  userIdColumn:
    | typeof supportRequests.userId
    | typeof featureRequestVotes.userId
    | typeof vendorConnections.userId
    | typeof vendorOAuthStates.userId,
): Promise<number> {
  return (
    await postgres.db
      .select()
      .from(table as typeof supportRequests)
      .where(eq(userIdColumn, "user_123"))
  ).length;
}

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
  await postgres.db.insert(featureRequests).values([
    {
      id: "user-feature",
      supportRequestId: "user-support",
      title: "Private request",
      message: "Delete this only copy.",
    },
    {
      id: "other-feature",
      supportRequestId: "other-support",
      title: "Retained request",
      message: "Keep another user's content.",
    },
  ]);
  await postgres.db.insert(featureRequestVotes).values({
    id: "user-vote",
    featureRequestId: "other-feature",
    userId: "user_123",
  });
  await postgres.db.insert(vendorConnections).values({
    id: "connection",
    userId: "user_123",
    vendor: "whoop",
    externalUserId: "external-user",
    accessTokenCiphertext: "encrypted-secret",
  });
  await postgres.db.insert(vendorOAuthStates).values({
    stateHash: "state-hash",
    userId: "user_123",
    vendor: "whoop",
    expiresAt: new Date("2026-08-01T20:00:00.000Z"),
  });
  await postgres.db.insert(vendorWebhookEvents).values({
    id: "webhook-event",
    userId: "user_123",
    vendor: "whoop",
    externalUserId: "external-user",
    deliveryKey: "delivery-key",
    eventType: "workout.updated",
    rawPayload: "{\"user_id\":\"external-user\"}",
  });
  await postgres.db.insert(adaptySubscriptionStates).values({
    userId: "user_123",
    hasAccess: true,
    eventType: "subscription_started",
    eventOccurredAt: new Date("2026-07-30T20:00:00.000Z"),
  });
  await postgres.db.insert(adaptyWebhookEvents).values({
    deliveryKey: "adapty-delivery-key",
    userId: "user_123",
    eventType: "subscription_started",
  });
}

describe("provider-neutral checkpoints and retry bookkeeping", () => {
  it("never treats a legacy Clerk checkpoint as Supabase erasure", async () => {
    await seedIdentitySpine();
    const repository = createDrizzleUserDeletionRepository(postgres.db);
    const deletedAt = new Date("2026-07-31T20:00:00.000Z");
    await repository.prepareDeletion("user_123", deletedAt);
    await repository.markClerkDeleted("user_123", deletedAt);

    const state = await repository.prepareDeletion(
      "user_123",
      new Date("2026-08-01T20:00:00.000Z"),
    );
    expect(state).toEqual(
      expect.objectContaining({
        deletedAt,
        clerkDeletedAt: deletedAt,
        authDeletedAt: null,
        authProvider: null,
      }),
    );
    // Incomplete for the Supabase worker.
    expect(await repository.listIncompleteDeletions(10)).toContain("user_123");
  });

  it("records Supabase erasure with an explicit provider field", async () => {
    await seedIdentitySpine();
    const repository = createDrizzleUserDeletionRepository(postgres.db);
    const deletedAt = new Date("2026-07-31T20:00:00.000Z");
    await repository.prepareDeletion("user_123", deletedAt);
    await repository.markAdaptyErased("user_123", deletedAt);
    await repository.markPosthogErased("user_123", deletedAt);
    await repository.markAuthDeleted("user_123", deletedAt, "supabase");

    const [row] = await postgres.db
      .select()
      .from(users)
      .where(eq(users.id, "user_123"));
    expect(row).toEqual(
      expect.objectContaining({
        authProvider: "supabase",
        authDeletedAt: deletedAt,
      }),
    );
    expect(await repository.listIncompleteDeletions(10)).not.toContain(
      "user_123",
    );
  });

  it("lists only incomplete tombstones for the durable worker", async () => {
    const repository = createDrizzleUserDeletionRepository(postgres.db);
    const deletedAt = new Date("2026-07-31T20:00:00.000Z");
    await postgres.db.insert(users).values([{ id: "active-user" }]);
    await repository.prepareDeletion("incomplete-user", deletedAt);
    await repository.prepareDeletion("complete-user", deletedAt);
    await repository.markAdaptyErased("complete-user", deletedAt);
    await repository.markPosthogErased("complete-user", deletedAt);
    await repository.markAuthDeleted("complete-user", deletedAt, "supabase");

    const incomplete = await repository.listIncompleteDeletions(10);
    expect(incomplete).toContain("incomplete-user");
    expect(incomplete).not.toContain("complete-user");
    expect(incomplete).not.toContain("active-user");
  });

  it("does not treat a checkpoint for a different auth provider as complete", async () => {
    const repository = createDrizzleUserDeletionRepository(postgres.db);
    const deletedAt = new Date("2026-07-31T20:00:00.000Z");
    await repository.prepareDeletion("provider-mismatch", deletedAt);
    await repository.markAdaptyErased("provider-mismatch", deletedAt);
    await repository.markPosthogErased("provider-mismatch", deletedAt);
    await repository.markAuthDeleted("provider-mismatch", deletedAt, "clerk");

    expect(await repository.listIncompleteDeletions(10)).toContain(
      "provider-mismatch",
    );
  });

  it("tracks failures with bounded sanitized retry state and clears leases", async () => {
    const repository = createDrizzleUserDeletionRepository(postgres.db);
    const deletedAt = new Date("2026-07-31T20:00:00.000Z");
    await repository.prepareDeletion("user_123", deletedAt);
    const nextRetry = new Date("2026-07-31T20:01:00.000Z");
    await repository.recordDeletionFailure(
      "user_123",
      deletedAt,
      nextRetry,
      "Supabase identity erasure did not succeed",
    );
    let [row] = await postgres.db
      .select()
      .from(users)
      .where(eq(users.id, "user_123"));
    expect(row).toEqual(
      expect.objectContaining({
        deletionAttempts: 1,
        deletionNextRetryAt: nextRetry,
        deletionLastError: "Supabase identity erasure did not succeed",
      }),
    );
    // Not yet retryable before nextRetry.
    expect(
      await repository.listIncompleteDeletions(
        10,
        new Date("2026-07-31T20:00:30.000Z"),
      ),
    ).not.toContain("user_123");
    expect(
      await repository.listIncompleteDeletions(
        10,
        new Date("2026-07-31T20:02:00.000Z"),
      ),
    ).toContain("user_123");
    await repository.clearDeletionLease("user_123");
    [row] = await postgres.db
      .select()
      .from(users)
      .where(eq(users.id, "user_123"));
    expect(row.deletionLeaseOwner).toBeNull();
  });

  it("atomically grants a deletion lease to only one replica until expiry", async () => {
    const repository = createDrizzleUserDeletionRepository(postgres.db);
    const now = new Date("2026-07-31T20:00:00.000Z");
    await repository.prepareDeletion("leased-user", now);
    const expiresAt = new Date(now.getTime() + 60_000);

    const claims = await Promise.all([
      repository.claimDeletionLease("leased-user", "replica-a", now, expiresAt),
      repository.claimDeletionLease("leased-user", "replica-b", now, expiresAt),
    ]);
    expect(claims.filter(Boolean)).toHaveLength(1);
    expect(
      await repository.claimDeletionLease(
        "leased-user",
        "replica-c",
        new Date(expiresAt.getTime() + 1),
        new Date(expiresAt.getTime() + 60_001),
      ),
    ).toBe(true);
  });

  it("keeps concurrent prepareDeletion calls serialized and replay-safe", async () => {
    await seedIdentitySpine();
    const repository = createDrizzleUserDeletionRepository(postgres.db);
    const deletedAt = new Date("2026-07-31T20:00:00.000Z");
    const results = await Promise.all([
      repository.prepareDeletion("user_123", deletedAt),
      repository.prepareDeletion("user_123", deletedAt),
      repository.prepareDeletion(
        "user_123",
        new Date("2026-08-02T20:00:00.000Z"),
      ),
    ]);
    for (const state of results) {
      expect(state.deletedAt).toEqual(deletedAt);
    }
    const [row] = await postgres.db
      .select()
      .from(users)
      .where(eq(users.id, "user_123"));
    expect(row.deletedAt).toEqual(deletedAt);
  });
});
