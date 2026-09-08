import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildServer } from "../src/index.js";

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe("GET /v1/health", () => {
  it("reports the API version and process uptime", async () => {
    app = buildServer({ logger: false });

    const response = await app.inject({
      method: "GET",
      url: "/v1/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.json()).toEqual({
      ok: true,
      version: "0.1.0",
      uptime: expect.any(Number),
    });
    expect(response.json<{ uptime: number }>().uptime).toBeGreaterThanOrEqual(0);
  });
});

describe("planned v1 routes", () => {
  it("fails closed when Supabase auth is not configured", async () => {
    app = buildServer({ logger: false });

    const response = await app.inject({ method: "GET", url: "/v1/user" });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      error: {
        code: "AUTH_UNAVAILABLE",
        message: "Authentication is not configured",
      },
    });
  });

});

describe("POST /v1/support", () => {
  it("does not reach the route when authentication is unconfigured", async () => {
    app = buildServer({ logger: false });

    const response = await app.inject({
      method: "POST",
      url: "/v1/support",
      payload: {
        category: "support",
        message: "Please help with my balance.",
      },
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      error: {
        code: "AUTH_UNAVAILABLE",
        message: "Authentication is not configured",
      },
    });
  });
});
