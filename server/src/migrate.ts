/**
 * Deploy-time entry point: `node dist/migrate.js`.
 *
 * Runs before the service restarts so the new code never meets an old schema.
 * Exits non-zero on any failure, which stops the deploy rather than letting a
 * healthy-looking process serve an unusable database — the exact failure this
 * script was written to end.
 */
import { runMigrations } from "./db/migrator.js";

async function main(): Promise<void> {
  const { migrationsFolder } = await runMigrations();
  process.stdout.write(`migrations applied from ${migrationsFolder}\n`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`migration failed: ${message}\n`);
  process.exitCode = 1;
});
