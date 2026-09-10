import { createHash } from "node:crypto";
import { mkdtemp, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterEach, describe, expect, it } from "vitest";
import { migrationsFolder } from "../src/db/migrator.js";
import { checkSchemaReady } from "../src/db/readiness.js";

const clients: PGlite[] = [];
const directories: string[] = [];
const legacyEntries = [
  [0, 1785352840196, "0000_nice_gabe_jones"],
  [1, 1785381108197, "0001_brave_echo"],
  [2, 1785546856080, "0002_sleepy_the_phantom"],
  [3, 1785548586853, "0003_lively_guardian"],
  [4, 1785549110689, "0004_natural_enchantress"],
  [5, 1785858116916, "0005_calm_tomorrow_man"],
  [6, 1788833924176, "0006_supabase_sync"],
  [7, 1788835345312, "0007_support_details_and_history"],
].map(([idx, when, tag]) => ({ idx, version: "7", when, tag, breakpoints: true }));
const legacyHashes = [
  "24926ffb7638b24b474243a16d40774c7b9dba53a4bf9afef3ea43802cdc1e37",
  "ff1099422fab6d59d1fc9090dffc21421bac1013030de59b9923c5bb331b414c",
  "9b1990d250430cfdd825ee646bcdd3d308faf8c26e70114c0018b951a4c31dd2",
  "15a3adbb3ec3a08ae2c547fe923596bde7f9f94478d506b2ec914b2feddbfa4e",
  "ab671c9113d086ea65dbdd60bd257aa1d51e05713406642546b0f77d083b102e",
  "4f907f2bf65192ffde399f2ab0831f00783976f6124b68b9caa270aac8657f0e",
  "7617ba2ffdf55b53dbe815b67865b3f7c0a90f6e918422bf7fb36538e64559ce",
  "187009a3598a3abad3b6c603ef632b0fd706e46e875e6101d7220a645e8e0187",
];

async function migrationRows(client: PGlite) {
  const result = await client.query<{ hash: string; created_at: string }>(
    "select hash, created_at::text as created_at from drizzle.__drizzle_migrations order by id",
  );
  return result.rows.map((row) => ({ hash: row.hash, createdAt: Number(row.created_at) }));
}

async function legacyProductionMigrations(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "excerlock-legacy-migrations-"));
  directories.push(directory);
  await mkdir(join(directory, "meta"));
  for (const entry of legacyEntries) {
    const tag = entry.tag as string;
    const source = Number(entry.idx) <= 5
      ? join(migrationsFolder, `${tag}.sql`)
      : join(import.meta.dirname, "fixtures", "legacy-production-migrations", `${tag}.sql`);
    await cp(source, join(directory, `${tag}.sql`));
  }
  await writeFile(join(directory, "meta", "_journal.json"), JSON.stringify({ version: "7", dialect: "postgresql", entries: legacyEntries }));
  return directory;
}

afterEach(async () => {
  await Promise.all(clients.splice(0).map((client) => client.close()));
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("production migration compatibility", { timeout: 15_000 }, () => {
  it("keeps the captured legacy SQL fixtures pinned to the deployed migration hashes", async () => {
    for (const [offset, tag] of ["0006_supabase_sync", "0007_support_details_and_history"].entries()) {
      const contents = await readFile(join(import.meta.dirname, "fixtures", "legacy-production-migrations", `${tag}.sql`));
      expect(createHash("sha256").update(contents).digest("hex")).toBe(legacyHashes[offset + 6]);
    }
  });

  it("applies ten migrations to a fresh database and replays idempotently", async () => {
    const client = new PGlite();
    clients.push(client);
    const db = drizzle(client);
    await migrate(db, { migrationsFolder });
    expect(await migrationRows(client)).toHaveLength(10);
    await migrate(db, { migrationsFolder });
    expect(await migrationRows(client)).toHaveLength(10);
  });

  it("upgrades the exact legacy production migration history without losing existing identity or sync data", async () => {
    const client = new PGlite();
    clients.push(client);
    const db = drizzle(client);
    await migrate(db, { migrationsFolder: await legacyProductionMigrations() });
    expect(await migrationRows(client)).toEqual(
      legacyHashes.map((hash, index) => ({ hash, createdAt: Number(legacyEntries[index]?.when) })),
    );
    await client.exec(`
      insert into users (id, email) values ('11111111-1111-4111-8111-111111111111', 'kept@example.com');
      insert into rules (id, user_id, activity, mode, schedule, enabled, created_at, updated_at)
      values ('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 'walking', '{}', '{}', true, now(), now());
    `);

    await expect(checkSchemaReady(db)).resolves.toEqual({ ready: false, reason: "schema-missing" });

    await migrate(db, { migrationsFolder });
    const upgradedMigrations = await migrationRows(client);
    expect(upgradedMigrations).toHaveLength(12);
    expect(upgradedMigrations.slice(0, 8)).toEqual(
      legacyHashes.map((hash, index) => ({ hash, createdAt: Number(legacyEntries[index]?.when) })),
    );
    await migrate(db, { migrationsFolder });
    expect(await migrationRows(client)).toEqual(upgradedMigrations);

    await expect(checkSchemaReady(db)).resolves.toEqual({ ready: true });
    const users = await client.query<{
      id: string;
      email: string;
      auth_provider: string | null;
      auth_deleted_at: Date | null;
      clerk_deleted_at: Date | null;
    }>("select id, email, auth_provider, auth_deleted_at, clerk_deleted_at from users");
    expect(users.rows).toEqual([{
      id: "11111111-1111-4111-8111-111111111111",
      email: "kept@example.com",
      auth_provider: null,
      auth_deleted_at: null,
      clerk_deleted_at: null,
    }]);
    const rules = await client.query<{ count: number }>("select count(*)::int as count from rules");
    expect(rules.rows[0]?.count).toBe(1);
  });

  it("fails closed instead of classifying an ambiguous UUID tombstone as Clerk", async () => {
    const client = new PGlite();
    clients.push(client);
    const db = drizzle(client);
    await migrate(db, { migrationsFolder: await legacyProductionMigrations() });
    await client.exec(`
      insert into users (id, auth_deleted_at)
      values ('33333333-3333-4333-8333-333333333333', now());
    `);

    await expect(migrate(db, { migrationsFolder })).rejects.toThrow(
      "Ambiguous legacy auth_deleted_at provider",
    );
    const columns = await client.query<{ column_name: string }>(`
      select column_name from information_schema.columns
      where table_schema = 'public' and table_name = 'users'
        and column_name in ('auth_provider', 'auth_deleted_at', 'clerk_deleted_at')
      order by column_name
    `);
    expect(columns.rows).toEqual([{ column_name: "auth_deleted_at" }]);
    const tombstone = await client.query<{ retained: boolean }>(`
      select auth_deleted_at is not null as retained from users
      where id = '33333333-3333-4333-8333-333333333333'
    `);
    expect(tombstone.rows).toEqual([{ retained: true }]);
  });
});
