import { describe, expect, it } from "vitest";

describe("Drizzle configuration", () => {
  it("loads without a configured or live Postgres database", async () => {
    const { default: drizzleConfig } = await import("../drizzle.config.js");

    expect(drizzleConfig).toMatchObject({
      dialect: "postgresql",
      schema: "./src/db/schema.ts",
      out: "./drizzle",
      dbCredentials: {
        url: "postgresql://localhost:5432/excerlock",
      },
    });
  });
});
