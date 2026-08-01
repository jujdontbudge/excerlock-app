import { eq, sql } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
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
import {
  createDrizzleFeatureRequestRepository,
  createDrizzleFeatureRequestVoteRepository,
  createDrizzleSupportSubmissionRepository,
} from "../src/support/index.js";
import { createPostgresJsTestDatabase } from "./postgresJsTestDatabase.js";
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

describe("repository database execution boundary", () => {
  it("rejects SQL that names a column absent from the migrations", async () => {
    await expect(
      postgres.db.execute(
        sql.raw('select "misspelled_column" from "support_requests"'),
      ),
    ).rejects.toThrow("misspelled_column");
  });

  it("matches schema.ts columns to the migrated Postgres catalog", async () => {
    const tables = [
      users,
      supportRequests,
      featureRequests,
      featureRequestVotes,
      vendorConnections,
      vendorOAuthStates,
      vendorWebhookEvents,
    ];
    const expectedColumns = tables.flatMap((table) => {
      const config = getTableConfig(table);
      return config.columns.map((column, ordinal) => ({
        tableName: config.name,
        columnName: column.name,
        ordinal: ordinal + 1,
        sqlType: column.getSQLType(),
        notNull: column.notNull,
        hasDefault: column.hasDefault,
      }));
    });

    const { rows: migratedColumns } = await postgres.client.query<{
      tableName: string;
      columnName: string;
      ordinal: number;
      sqlType: string;
      notNull: boolean;
      hasDefault: boolean;
    }>(`
      select
        table_name as "tableName",
        column_name as "columnName",
        ordinal_position as ordinal,
        data_type as "sqlType",
        is_nullable = 'NO' as "notNull",
        column_default is not null as "hasDefault"
      from information_schema.columns
      where table_schema = 'public'
      order by table_name, ordinal_position
    `);

    expect(migratedColumns).toEqual(
      expectedColumns.sort((left, right) =>
        left.tableName.localeCompare(right.tableName) ||
        left.ordinal - right.ordinal,
      ),
    );
  });
});

describe("support submission repository", () => {
  it("does not treat a deletion tombstone as an active support user", async () => {
    await postgres.db.insert(users).values({
      id: "deleted_user",
      deletedAt: new Date("2026-07-31T20:00:00.000Z"),
    });
    const repository = createDrizzleSupportSubmissionRepository(postgres.db);

    await expect(repository.userExists("deleted_user")).resolves.toBe(false);
    await expect(
      repository.insertSupportSubmission({
        id: "late-support",
        userId: "deleted_user",
        category: "support",
        title: null,
        message: "This must not be attached to a tombstone.",
        createdAt: new Date("2026-07-31T20:01:00.000Z"),
        featureRequest: null,
      }),
    ).rejects.toThrow("User is deleted");
  });

  it("opens one transaction for a feature submission", async () => {
    const database = createPostgresJsTestDatabase(() => [["user_123"]]);
    const repository = createDrizzleSupportSubmissionRepository(
      database.db,
    );
    const createdAt = new Date("2026-07-29T21:00:00.000Z");

    await repository.insertSupportSubmission({
      id: "support-request-id",
      userId: "user_123",
      category: "feature",
      title: "Home Screen widget",
      message: "Show my balance without opening the app.",
      createdAt,
      featureRequest: {
        id: "feature-request-id",
        title: "Home Screen widget",
        message: "Show my balance without opening the app.",
        createdAt,
      },
    });

    expect(database.transactionCount).toBe(1);
  });

  it("persists a support request and its feature-request list entry", async () => {
    await postgres.db.insert(users).values({ id: "user_123" });
    const repository = createDrizzleSupportSubmissionRepository(
      postgres.db,
    );
    const createdAt = new Date("2026-07-29T21:00:00.000Z");

    await repository.insertSupportSubmission({
      id: "support-request-id",
      userId: "user_123",
      category: "feature",
      title: "Home Screen widget",
      message: "Show my balance without opening the app.",
      createdAt,
      featureRequest: {
        id: "feature-request-id",
        title: "Home Screen widget",
        message: "Show my balance without opening the app.",
        createdAt,
      },
    });

    const [supportRow] = await postgres.db
      .select()
      .from(supportRequests)
      .where(eq(supportRequests.id, "support-request-id"));
    const [featureRow] = await postgres.db
      .select()
      .from(featureRequests)
      .where(eq(featureRequests.id, "feature-request-id"));

    expect({ supportRow, featureRow }).toEqual({
      supportRow: {
        id: "support-request-id",
        userId: "user_123",
        category: "feature",
        title: "Home Screen widget",
        message: "Show my balance without opening the app.",
        createdAt,
      },
      featureRow: {
        id: "feature-request-id",
        supportRequestId: "support-request-id",
        title: "Home Screen widget",
        message: "Show my balance without opening the app.",
        createdAt,
      },
    });
  });

  it("rolls back the support request when its feature insert fails", async () => {
    await postgres.db.insert(users).values({ id: "user_123" });
    await postgres.db.insert(supportRequests).values({
      id: "existing-support-id",
      userId: "user_123",
      category: "feature",
      title: "Existing request",
      message: "Already persisted.",
    });
    await postgres.db.insert(featureRequests).values({
      id: "duplicate-feature-id",
      supportRequestId: "existing-support-id",
      title: "Existing request",
      message: "Already persisted.",
    });
    const repository = createDrizzleSupportSubmissionRepository(
      postgres.db,
    );

    await expect(
      repository.insertSupportSubmission({
        id: "rolled-back-support-id",
        userId: "user_123",
        category: "feature",
        title: "New request",
        message: "This transaction must roll back.",
        createdAt: new Date("2026-07-29T21:00:00.000Z"),
        featureRequest: {
          id: "duplicate-feature-id",
          title: "New request",
          message: "This transaction must roll back.",
          createdAt: new Date("2026-07-29T21:00:00.000Z"),
        },
      }),
    ).rejects.toThrow();

    await expect(
      postgres.db
        .select({ id: supportRequests.id })
        .from(supportRequests)
        .where(eq(supportRequests.id, "rolled-back-support-id")),
    ).resolves.toEqual([]);
  });
});

describe("feature request vote repository", () => {
  it("uses the database conflict result to make a duplicate vote a no-op", async () => {
    await postgres.db.insert(users).values({ id: "user_123" });
    await postgres.db.insert(supportRequests).values({
      id: "support-request-id",
      userId: "user_123",
      category: "feature",
      title: "Home Screen widget",
      message: "Show my balance without opening the app.",
    });
    await postgres.db.insert(featureRequests).values({
      id: "feature-request-id",
      supportRequestId: "support-request-id",
      title: "Home Screen widget",
      message: "Show my balance without opening the app.",
    });
    const repository = createDrizzleFeatureRequestVoteRepository(
      postgres.db,
    );
    const createdAt = new Date("2026-07-29T21:05:00.000Z");

    const first = await repository.recordFeatureRequestVote({
      id: "vote-1",
      featureRequestId: "feature-request-id",
      userId: "user_123",
      createdAt,
    });
    const duplicate = await repository.recordFeatureRequestVote({
      id: "vote-retry",
      featureRequestId: "feature-request-id",
      userId: "user_123",
      createdAt,
    });

    expect({ first, duplicate }).toEqual({
      first: { status: "voted", voteCount: 1 },
      duplicate: { status: "alreadyVoted", voteCount: 1 },
    });
  });
});

describe("feature request list repository", () => {
  it("returns counts and user vote state from one aggregate query", async () => {
    await postgres.db.insert(users).values([
      { id: "user_123" },
      { id: "user_456" },
      { id: "user_789" },
    ]);
    await postgres.db.insert(supportRequests).values({
      id: "support-request-id",
      userId: "user_123",
      category: "feature",
      title: "Home Screen widget",
      message: "Show my balance without opening the app.",
      createdAt: new Date("2026-07-29T21:00:00.000Z"),
    });
    await postgres.db.insert(featureRequests).values({
      id: "feature-request-id",
      supportRequestId: "support-request-id",
      title: "Home Screen widget",
      message: "Show my balance without opening the app.",
      createdAt: new Date("2026-07-29T21:00:00.000Z"),
    });
    const voteRepository = createDrizzleFeatureRequestVoteRepository(
      postgres.db,
    );
    await Promise.all(
      ["user_123", "user_456", "user_789"].map((userId, index) =>
        voteRepository.recordFeatureRequestVote({
          id: `vote-${index + 1}`,
          featureRequestId: "feature-request-id",
          userId,
          createdAt: new Date("2026-07-29T21:05:00.000Z"),
        }),
      ),
    );
    const repository = createDrizzleFeatureRequestRepository(postgres.db);

    await expect(
      repository.listFeatureRequests("user_123"),
    ).resolves.toEqual([
      {
        id: "feature-request-id",
        submissionId: "support-request-id",
        title: "Home Screen widget",
        message: "Show my balance without opening the app.",
        voteCount: 3,
        hasVoted: true,
        createdAt: new Date("2026-07-29T21:00:00.000Z"),
      },
    ]);
  });
});
