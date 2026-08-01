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
  featureRequestVotes,
  featureRequests,
  supportRequests,
  users,
  vendorConnections,
  vendorOAuthStates,
  vendorWebhookEvents,
} from "../src/db/schema.js";
import { createDrizzleUserDeletionRepository } from "../src/userDeletion/index.js";
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
    }).toEqual({
      first: {
        deletedAt,
        adaptyErasedAt: null,
        posthogErasedAt: null,
        clerkDeletedAt: null,
      },
      retry: {
        deletedAt,
        adaptyErasedAt: null,
        posthogErasedAt: null,
        clerkDeletedAt: null,
      },
      deletedUser: {
        id: "user_123",
        email: null,
        createdAt: new Date("2026-07-30T20:00:00.000Z"),
        updatedAt: deletedAt,
        deletedAt,
        adaptyErasedAt: null,
        posthogErasedAt: null,
        clerkDeletedAt: null,
      },
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
}
