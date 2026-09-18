import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { fileURLToPath } from "node:url";
import * as schema from "../src/db/schema.js";

const migrationsFolder = fileURLToPath(
  new URL("../drizzle", import.meta.url),
);

export async function createPgliteTestDatabase() {
  const client = new PGlite();
  const db = drizzle(client, { schema });

  await migrate(db, { migrationsFolder });

  return {
    client,
    db,
    async reset() {
      await client.exec(`
        truncate table
          adapty_webhook_events,
          adapty_subscription_states,
          feature_request_votes,
          feature_requests,
          support_requests,
          incident_reports,
          vendor_webhook_events,
          vendor_oauth_states,
          vendor_connections,
          users
        restart identity cascade
      `);
    },
  };
}
