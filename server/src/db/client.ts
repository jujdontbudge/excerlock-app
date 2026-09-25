import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { config } from "../config.js";
import * as schema from "./schema.js";

function createConnection(databaseUrl: string) {
  const client = postgres(databaseUrl, {
    max: 10,
    onnotice: () => undefined,
  });

  return {
    client,
    db: drizzle(client, { schema }),
  };
}

let connection: ReturnType<typeof createConnection> | undefined;

export function getDb(): ReturnType<typeof createConnection>["db"] | null {
  if (!config.databaseUrl) {
    return null;
  }

  connection ??= createConnection(config.databaseUrl);
  return connection.db;
}

export async function closeDb(): Promise<void> {
  await connection?.client.end();
  connection = undefined;
}
