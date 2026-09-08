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
  adaptySubscriptionStates,
  adaptyWebhookEvents,
  earnedUnlocks,
  profiles,
  ruleDays,
  rules,
  supportRequests,
  usageDays,
  users,
} from "../src/db/schema.js";
import { createDrizzleSupportSubmissionRepository } from "../src/support/index.js";
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

/** Postgres writes `numeric(12,3)`, drizzle writes `numeric(12, 3)`. */
function normalizeSqlType(sqlType: string): string {
  return sqlType.replace(/\s*,\s*/g, ",");
}

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
      adaptySubscriptionStates,
      adaptyWebhookEvents,
      earnedUnlocks,
      profiles,
      ruleDays,
      rules,
      supportRequests,
      usageDays,
      users,
    ];
    const expectedColumns = tables.flatMap((table) => {
      const config = getTableConfig(table);
      return config.columns.map((column, ordinal) => ({
        tableName: config.name,
        columnName: column.name,
        ordinal: ordinal + 1,
        sqlType: normalizeSqlType(column.getSQLType()),
        notNull: column.notNull,
        hasDefault: column.hasDefault,
      }));
    });

    // `format_type` rather than `information_schema.data_type`, which erases a
    // numeric's precision and would let `numeric(12, 3)` drift to plain
    // `numeric` without the guardrail noticing.
    const { rows: migratedColumns } = await postgres.client.query<{
      tableName: string;
      columnName: string;
      ordinal: number;
      sqlType: string;
      notNull: boolean;
      hasDefault: boolean;
    }>(`
      select
        class.relname as "tableName",
        attribute.attname as "columnName",
        attribute.attnum as ordinal,
        format_type(attribute.atttypid, attribute.atttypmod) as "sqlType",
        attribute.attnotnull as "notNull",
        attribute.atthasdef as "hasDefault"
      from pg_attribute attribute
      join pg_class class on class.oid = attribute.attrelid
      join pg_namespace namespace on namespace.oid = class.relnamespace
      where namespace.nspname = 'public'
        and class.relkind = 'r'
        and attribute.attnum > 0
        and not attribute.attisdropped
      order by class.relname, attribute.attnum
    `);

    expect(
      migratedColumns.map((column) => ({
        ...column,
        sqlType: normalizeSqlType(column.sqlType),
      })),
    ).toEqual(
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
      }),
    ).rejects.toThrow("User is deleted");
  });

  it("opens one transaction for a submission", async () => {
    const database = createPostgresJsTestDatabase(() => [["user_123"]]);
    const repository = createDrizzleSupportSubmissionRepository(database.db);

    await repository.insertSupportSubmission({
      id: "support-request-id",
      userId: "user_123",
      category: "feature",
      title: "Home Screen widget",
      message: "Show my streak without opening the app.",
      createdAt: new Date("2026-07-29T21:00:00.000Z"),
    });

    expect(database.transactionCount).toBe(1);
  });

  it("persists an idea submission as one support request and nothing else", async () => {
    await postgres.db.insert(users).values({ id: "user_123" });
    const repository = createDrizzleSupportSubmissionRepository(postgres.db);
    const createdAt = new Date("2026-07-29T21:00:00.000Z");

    await repository.insertSupportSubmission({
      id: "support-request-id",
      userId: "user_123",
      category: "feature",
      title: "Home Screen widget",
      message: "Show my streak without opening the app.",
      createdAt,
    });

    const [supportRow] = await postgres.db
      .select()
      .from(supportRequests)
      .where(eq(supportRequests.id, "support-request-id"));

    expect(supportRow).toEqual({
      id: "support-request-id",
      userId: "user_123",
      category: "feature",
      title: "Home Screen widget",
      message: "Show my streak without opening the app.",
      createdAt,
    });
  });

  it("rolls back rather than persisting a duplicate submission id", async () => {
    await postgres.db.insert(users).values({ id: "user_123" });
    await postgres.db.insert(supportRequests).values({
      id: "existing-support-id",
      userId: "user_123",
      category: "feature",
      title: "Existing request",
      message: "Already persisted.",
    });
    const repository = createDrizzleSupportSubmissionRepository(postgres.db);

    await expect(
      repository.insertSupportSubmission({
        id: "existing-support-id",
        userId: "user_123",
        category: "feature",
        title: "New request",
        message: "This transaction must roll back.",
        createdAt: new Date("2026-07-29T21:00:00.000Z"),
      }),
    ).rejects.toThrow();

    await expect(
      postgres.db
        .select({ message: supportRequests.message })
        .from(supportRequests)
        .where(eq(supportRequests.id, "existing-support-id")),
    ).resolves.toEqual([{ message: "Already persisted." }]);
  });
});
