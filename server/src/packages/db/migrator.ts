import { drizzle } from "drizzle-orm/postgres-js";
import { migrate as postgresMigrate } from "drizzle-orm/postgres-js/migrator";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { config } from "../config/config.js";

export const migrationsFolder = fileURLToPath(
  new URL("../../../drizzle", import.meta.url),
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
  const client = postgres(databaseUrl, { max: 1, onnotice: () => undefined });

  return {
    db: drizzle(client),
    close: () => client.end(),
  };
}

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
