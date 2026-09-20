import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate as pgliteMigrate } from "drizzle-orm/pglite/migrator";
import { describe, expect, it } from "vitest";
import {
  MigrationConfigurationError,
  migrationsFolder,
  runMigrations,
} from "../src/db/migrator.js";

/**
 * The production migrator is a thin seam over drizzle's migrator, so these
 * tests pin the two things that actually failed in production: nothing ever
 * invoked it, and it must refuse to run silently when unconfigured.
 *
 * The folder is exercised for real against PGlite so a broken or missing
 * migrations directory fails here rather than on the box.
 */
describe("runMigrations", () => {
  it("refuses to run without a database url instead of exiting successfully", async () => {
    await expect(
      runMigrations({
        databaseUrl: "",
        connect: () => {
          throw new Error("must not connect");
        },
        migrate: async () => {
          throw new Error("must not migrate");
        },
      }),
    ).rejects.toBeInstanceOf(MigrationConfigurationError);
  });

  it("treats a whitespace-only database url as absent", async () => {
    await expect(
      runMigrations({
        databaseUrl: "   ",
        connect: () => {
          throw new Error("must not connect");
        },
        migrate: async () => {
          throw new Error("must not migrate");
        },
      }),
    ).rejects.toBeInstanceOf(MigrationConfigurationError);
  });

  it("migrates against the resolved folder and always closes the connection", async () => {
    const seen: { folder?: string } = {};
    let closed = false;

    const result = await runMigrations({
      databaseUrl: "postgres://example/db",
      connect: () => ({
        db: {} as never,
        close: async () => {
          closed = true;
        },
      }),
      migrate: async (_db, options) => {
        seen.folder = options.migrationsFolder;
      },
    });

    expect(result).toEqual({ migrationsFolder });
    expect(seen.folder).toBe(migrationsFolder);
    expect(closed).toBe(true);
  });

  it("closes the connection even when a migration fails", async () => {
    let closed = false;

    await expect(
      runMigrations({
        databaseUrl: "postgres://example/db",
        connect: () => ({
          db: {} as never,
          close: async () => {
            closed = true;
          },
        }),
        migrate: async () => {
          throw new Error("relation already exists");
        },
      }),
    ).rejects.toThrow("relation already exists");

    expect(closed).toBe(true);
  });

  it("points at a folder that really does build the whole schema", async () => {
    const client = new PGlite();
    const db = drizzle(client);

    await pgliteMigrate(db, { migrationsFolder });

    const tables = await client.query<{ tablename: string }>(
      "select tablename from pg_tables where schemaname = 'public' order by tablename",
    );
    const names = tables.rows.map((row) => row.tablename);

    expect(names).toContain("users");
    expect(names).toContain("adapty_subscription_states");
    expect(names).toContain("adapty_webhook_events");
    expect(names).toContain("support_requests");

    await client.close();
  }, 30_000);
});
