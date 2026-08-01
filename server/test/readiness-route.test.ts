import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { createHealthRoutes } from "../src/routes/health.js";

async function buildApp(
  check: () => Promise<{ ready: boolean; reason?: string }>,
) {
  const app = Fastify();
  await app.register(createHealthRoutes({ checkReady: check as never }), {
    prefix: "/v1",
  });
  return app;
}

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
});
