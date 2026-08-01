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

describe("checkSchemaReady", () => {
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

  it("reports not ready rather than throwing when there is no database", async () => {
    await expect(checkSchemaReady(null)).resolves.toEqual({
      ready: false,
      reason: "no-database-url",
    });
  });
});
