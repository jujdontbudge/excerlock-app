import { drizzle } from "drizzle-orm/postgres-js";
import { migrate as postgresMigrate } from "drizzle-orm/postgres-js/migrator";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { config } from "../config.js";

/**
 * The compiled entry point lives at dist/db/migrator.js and the SQL ships
 * alongside it at dist/../drizzle, which is the same relative position the
 * source occupies. One expression therefore resolves correctly in both.
 */
export const migrationsFolder = fileURLToPath(
  new URL("../../drizzle", import.meta.url),
);

export class MigrationConfigurationError extends Error {
  constructor() {
    super(
      "DATABASE_URL is not set, so there is no database to migrate. " +
        "Set it in the service EnvironmentFile before deploying.",
    );
    this.name = "MigrationConfigurationError";
  }
}

interface MigrationConnection {
  db: Parameters<typeof postgresMigrate>[0];
  close: () => Promise<void>;
}

export interface RunMigrationsOptions {
  databaseUrl?: string;
  connect?: (databaseUrl: string) => MigrationConnection;
  migrate?: (
    db: MigrationConnection["db"],
    options: { migrationsFolder: string },
  ) => Promise<void>;
}

function connectWithPostgres(databaseUrl: string): MigrationConnection {
  // One connection, no pool: a migration is a single serial conversation and a
  // lingering pool would keep the deploy's node process alive after it ends.
  const client = postgres(databaseUrl, { max: 1, onnotice: () => undefined });

  return {
    db: drizzle(client),
    close: () => client.end(),
  };
}

/**
 * Applies every pending migration in `drizzle/` to the configured database.
 *
 * Drizzle records applied migrations in its own journal table, so re-running
 * this against an up-to-date database is a no-op. That is what makes it safe
 * to call on every deploy.
 */
export async function runMigrations(
  options: RunMigrationsOptions = {},
): Promise<{ migrationsFolder: string }> {
  const databaseUrl = (options.databaseUrl ?? config.databaseUrl ?? "").trim();
  if (!databaseUrl) {
    throw new MigrationConfigurationError();
  }

  const connect = options.connect ?? connectWithPostgres;
  const migrate = options.migrate ?? postgresMigrate;
  const connection = connect(databaseUrl);

  try {
    await migrate(connection.db, { migrationsFolder });
  } finally {
    await connection.close();
  }

  return { migrationsFolder };
}
