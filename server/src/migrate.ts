import { runMigrations } from "./packages/db/migrator.js";

async function main(): Promise<void> {
  const { migrationsFolder } = await runMigrations();
  process.stdout.write(`migrations applied from ${migrationsFolder}\n`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`migration failed: ${message}\n`);
  process.exitCode = 1;
});
