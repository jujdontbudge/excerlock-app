import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterEach, describe, expect, it } from "vitest";
import { migrationsFolder } from "../src/db/migrator.js";
import { checkSchemaReady } from "../src/db/readiness.js";

/**
 * The production database served `/v1/health` 200s for days while holding zero
 * tables, because liveness never touches the schema. These tests pin the check
 * that would have caught it: a migrated database is ready, an empty one is not.
 */
const clients: PGlite[] = [];

function newDatabase() {
  const client = new PGlite();
  clients.push(client);
  return { client, db: drizzle(client) };
}

afterEach(async () => {
  await Promise.all(clients.splice(0).map((client) => client.close()));
});

describe("checkSchemaReady", { timeout: 15_000 }, () => {
  it("reports not ready when the database has no tables at all", async () => {
    const { db } = newDatabase();

    await expect(checkSchemaReady(db)).resolves.toEqual({
      ready: false,
      reason: "schema-missing",
    });
  });

  it("reports ready once the migrations have been applied", async () => {
    const { db } = newDatabase();
    await migrate(db, { migrationsFolder });

    await expect(checkSchemaReady(db)).resolves.toEqual({ ready: true });
  });

  it("reports not ready when a required table has been dropped", async () => {
    const { client, db } = newDatabase();
    await migrate(db, { migrationsFolder });
    await client.exec("drop table adapty_subscription_states cascade");

    await expect(checkSchemaReady(db)).resolves.toEqual({
      ready: false,
      reason: "schema-missing",
    });
  });

  it.each([
    ["a required column", "alter table users drop column deletion_next_retry_at cascade"],
    ["the deletion retry index", "drop index users_deletion_retry_index"],
    ["a deletion retry index on the wrong columns", "drop index users_deletion_retry_index; create index users_deletion_retry_index on users (updated_at)"],
    ["an environment-scoped primary key", "alter table adapty_webhook_events drop constraint adapty_webhook_events_environment_delivery_key_pk"],
  ])("reports not ready when %s is missing", async (_label, mutation) => {
    const { client, db } = newDatabase();
    await migrate(db, { migrationsFolder });
    await client.exec(mutation);

    await expect(checkSchemaReady(db)).resolves.toEqual({
      ready: false,
      reason: "schema-missing",
    });
  });

  it("reports not ready rather than throwing when there is no database", async () => {
    await expect(checkSchemaReady(null)).resolves.toEqual({
      ready: false,
      reason: "no-database-url",
    });
  });
});
