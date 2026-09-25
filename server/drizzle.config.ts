import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const localDatabaseUrl = "postgresql://localhost:5432/excerlock";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/packages/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL?.trim() || localDatabaseUrl,
  },
});
