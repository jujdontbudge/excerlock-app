import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { migrationsFolder } from "../src/db/migrator.js";
import { checkSchemaReady } from "../src/db/readiness.js";

/**
 * 0006 is the first migration that has to survive real production data: it
 * renames the deletion checkpoint column and drops five tables. These tests
 * build a database that stops at 0005, put rows in it, and then run 0006 —
 * the sequence the VPS will actually perform.
 */
const scratchDirectories: string[] = [];
const clients: PGlite[] = [];

afterEach(async () => {
  await Promise.all(clients.splice(0).map((client) => client.close()));
  await Promise.all(
    scratchDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

interface JournalEntry {
  readonly tag: string;
}

/** A copy of `drizzle/` whose journal stops after the named migration. */
async function migrationsFolderThrough(tag: string): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "excerlock-migrations-"));
  scratchDirectories.push(directory);
  await cp(migrationsFolder, directory, { recursive: true });

  const journalPath = join(directory, "meta", "_journal.json");
  const journal = JSON.parse(await readFile(journalPath, "utf8")) as {
    entries: JournalEntry[];
  };
  const cutoff = journal.entries.findIndex((entry) => entry.tag === tag);
  expect(cutoff, `migration ${tag} must exist`).toBeGreaterThanOrEqual(0);
  journal.entries = journal.entries.slice(0, cutoff + 1);
  await writeFile(journalPath, JSON.stringify(journal, null, 2));

  return directory;
}

async function databaseAt(tag: string) {
  const client = new PGlite();
  clients.push(client);
  const db = drizzle(client);
  await migrate(db, { migrationsFolder: await migrationsFolderThrough(tag) });
  return { client, db };
}

async function tableNames(client: PGlite): Promise<string[]> {
  const result = await client.query<{ tablename: string }>(
    "select tablename from pg_tables where schemaname = 'public' order by tablename",
  );
  return result.rows.map((row) => row.tablename);
}

describe("migration 0006 on a 0005 database", () => {
  it("renames the deletion checkpoint without losing its values", async () => {
    const { client, db } = await databaseAt("0005_calm_tomorrow_man");
    await client.exec(`
      insert into users (id, email, clerk_deleted_at)
      values
        ('half_deleted', null, timestamptz '2026-08-01 20:00:00+00'),
        ('live_user', 'person@example.com', null)
    `);

    await migrate(db, { migrationsFolder });

    const { rows } = await client.query<{
      id: string;
      auth_deleted_at: Date | null;
    }>("select id, auth_deleted_at from users order by id");
    expect(rows).toEqual([
      { id: "half_deleted", auth_deleted_at: new Date("2026-08-01T20:00:00Z") },
      { id: "live_user", auth_deleted_at: null },
    ]);
  });

  it("drops the vendor and feature-request tables even when they hold rows", async () => {
    const { client, db } = await databaseAt("0005_calm_tomorrow_man");
    await client.exec(`
      insert into users (id) values ('user_123');
      insert into support_requests (id, user_id, category, message)
        values ('support-1', 'user_123', 'feature', 'Please add a widget.');
      insert into feature_requests (id, support_request_id, title, message)
        values ('feature-1', 'support-1', 'Widget', 'Please add a widget.');
      insert into feature_request_votes (id, feature_request_id, user_id)
        values ('vote-1', 'feature-1', 'user_123');
      insert into vendor_connections
        (id, user_id, vendor, external_user_id, access_token_ciphertext)
        values ('connection-1', 'user_123', 'whoop', 'external-1', 'ciphertext');
      insert into vendor_oauth_states (state_hash, user_id, vendor, expires_at)
        values ('state-hash', 'user_123', 'whoop', now());
      insert into vendor_webhook_events
        (id, user_id, vendor, external_user_id, delivery_key, event_type, raw_payload)
        values ('event-1', 'user_123', 'whoop', 'external-1', 'delivery-1', 'workout.updated', '{}');
    `);

    await migrate(db, { migrationsFolder });

    const names = await tableNames(client);
    expect(
      names.filter((name) => /vendor|feature/.test(name)),
    ).toEqual([]);
    const { rows } = await client.query<{ id: string }>(
      "select id from support_requests",
    );
    expect(rows).toEqual([{ id: "support-1" }]);
  });

  it("adds the sync tables and turns readiness green", async () => {
    const { client, db } = await databaseAt("0005_calm_tomorrow_man");

    await expect(checkSchemaReady(db)).resolves.toEqual({
      ready: false,
      reason: "schema-missing",
    });

    await migrate(db, { migrationsFolder });

    expect(await tableNames(client)).toEqual([
      "adapty_subscription_states",
      "adapty_webhook_events",
      "earned_unlocks",
      "profiles",
      "rule_days",
      "rules",
      "support_requests",
      "usage_days",
      "users",
    ]);
    await expect(checkSchemaReady(db)).resolves.toEqual({ ready: true });
  });

  it("is idempotent, because the deploy runs it on every release", async () => {
    const { client, db } = await databaseAt("0005_calm_tomorrow_man");

    await migrate(db, { migrationsFolder });
    await migrate(db, { migrationsFolder });

    await expect(checkSchemaReady(db)).resolves.toEqual({ ready: true });
    expect(await tableNames(client)).toContain("rules");
  });
});
