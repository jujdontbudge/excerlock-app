import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { parseEnv, type Environment } from "../src/env.js";
import { createHealthRoutes } from "../src/routes/health.js";

async function buildApp(
  checkSchema: () => Promise<{ ready: boolean; reason?: string }>,
  environment: Environment = parseEnv({ NODE_ENV: "test" }),
) {
  const app = Fastify();
  await app.register(createHealthRoutes({ checkSchema: checkSchema as never, environment }), {
    prefix: "/v1",
  });
  return app;
}

const productionEnvironment = (overrides: Record<string, string | undefined> = {}) => parseEnv({
  NODE_ENV: "production",
  DATABASE_URL: "postgres:///excerlock",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role",
  ADAPTY_SECRET_KEY: "adapty-secret",
  POSTHOG_PERSONAL_API_KEY: "posthog-personal",
  POSTHOG_PROJECT_ID: "123",
  ...overrides,
});

describe("GET /v1/ready", () => {
  it("answers 200 when the schema is present", async () => {
    const app = await buildApp(async () => ({ ready: true }));

    const response = await app.inject({ method: "GET", url: "/v1/ready" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ ready: true });
    await app.close();
  });

  it("answers 503 with the reason when the schema is missing", async () => {
    const app = await buildApp(async () => ({
      ready: false,
      reason: "schema-missing",
    }));

    const response = await app.inject({ method: "GET", url: "/v1/ready" });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({
      ready: false,
      reason: "schema-missing",
    });
    await app.close();
  });

  it("keeps liveness independent of the database", async () => {
    const app = await buildApp(async () => {
      throw new Error("database is on fire");
    });

    const response = await app.inject({ method: "GET", url: "/v1/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ ok: true });
    await app.close();
  });

  it.each(["POSTHOG_PERSONAL_API_KEY", "POSTHOG_PROJECT_ID"])(
    "answers 503 without exposing which required production credential is missing: %s",
    async (missing) => {
      const app = await buildApp(
        async () => ({ ready: true }),
        productionEnvironment({ [missing]: "" }),
      );

      const response = await app.inject({ method: "GET", url: "/v1/ready" });

      expect(response.statusCode).toBe(503);
      expect(response.json()).toMatchObject({ ready: false, reason: "configuration-missing" });
      expect(response.body).not.toContain(missing);
      await app.close();
    },
  );

  it("answers 200 when production erasure configuration and schema are ready", async () => {
    const app = await buildApp(async () => ({ ready: true }), productionEnvironment());
    const response = await app.inject({ method: "GET", url: "/v1/ready" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ ready: true });
    await app.close();
  });

  it("preserves a schema failure instead of replacing it with a configuration reason", async () => {
    const app = await buildApp(
      async () => ({ ready: false, reason: "schema-missing" }),
      productionEnvironment({ POSTHOG_PROJECT_ID: "" }),
    );
    const response = await app.inject({ method: "GET", url: "/v1/ready" });
    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({ ready: false, reason: "schema-missing" });
    await app.close();
  });

  it("keeps health live without production erasure configuration or schema access", async () => {
    const app = await buildApp(
      async () => { throw new Error("must not inspect schema"); },
      productionEnvironment({ POSTHOG_PERSONAL_API_KEY: "", POSTHOG_PROJECT_ID: "" }),
    );
    const response = await app.inject({ method: "GET", url: "/v1/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ ok: true });
    await app.close();
  });
});
