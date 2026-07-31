import { eq, sql } from "drizzle-orm";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import {
  featureRequests,
  supportRequests,
  users,
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
});

describe("support submission repository", () => {
  it("opens one transaction for a feature submission", async () => {
    const database = createPostgresJsTestDatabase();
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
});

describe("feature request vote repository", () => {
  it("uses the database conflict result to make a duplicate vote a no-op", async () => {
    let insertAttempt = 0;
    const database = createPostgresJsTestDatabase((sql) => {
      if (
        sql.startsWith('select "id" from "feature_requests"')
      ) {
        return [["feature-request-id"]];
      }
      if (sql.startsWith('insert into "feature_request_votes"')) {
        insertAttempt += 1;
        return insertAttempt === 1 ? [["vote-1"]] : [];
      }
      if (
        sql.startsWith(
          'select count("id") from "feature_request_votes"',
        )
      ) {
        return [[1]];
      }
      return [];
    });
    const repository = createDrizzleFeatureRequestVoteRepository(
      database.db,
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

    expect({
      first,
      duplicate,
      transactionCount: database.transactionCount,
      voteInsertSql: database.queries
        .filter(({ sql }) =>
          sql.startsWith('insert into "feature_request_votes"'),
        )
        .map(({ sql }) => sql),
    }).toEqual({
      first: { status: "voted", voteCount: 1 },
      duplicate: { status: "alreadyVoted", voteCount: 1 },
      transactionCount: 2,
      voteInsertSql: [
        'insert into "feature_request_votes" ("id", "feature_request_id", "user_id", "created_at") values ($1, $2, $3, $4) on conflict ("feature_request_id","user_id") do nothing returning "id"',
        'insert into "feature_request_votes" ("id", "feature_request_id", "user_id", "created_at") values ($1, $2, $3, $4) on conflict ("feature_request_id","user_id") do nothing returning "id"',
      ],
    });
  });
});

describe("feature request list repository", () => {
  it("returns counts and user vote state from one aggregate query", async () => {
    const database = createPostgresJsTestDatabase((sql) => {
      if (sql.includes('from "feature_requests" left join')) {
        return [
          [
            "feature-request-id",
            "support-request-id",
            "Home Screen widget",
            "Show my balance without opening the app.",
            3,
            true,
            "2026-07-29T21:00:00.000Z",
          ],
        ];
      }
      return [];
    });
    const repository = createDrizzleFeatureRequestRepository(database.db);

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
    expect(database.queries).toHaveLength(1);
    expect(database.queries[0]).toEqual({
      sql: expect.stringContaining(
        'coalesce(bool_or("feature_request_votes"."user_id" = $1), false)',
      ),
      params: ["user_123"],
    });
    expect(database.queries[0]?.sql).toContain(
      'order by "feature_requests"."created_at" desc, "feature_requests"."id" desc',
    );
  });
});
