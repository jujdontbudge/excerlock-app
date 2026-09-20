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

describe("proxy metadata", () => {
  it("does not trust forwarded client IPs from a direct connection", async () => {
    app = buildServer({ logger: false });
    app.get("/test-client-ip", async (request) => request.ip);

    const response = await app.inject({
      method: "GET",
      url: "/test-client-ip",
      remoteAddress: "203.0.113.10",
      headers: { "x-forwarded-for": "198.51.100.22" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe("203.0.113.10");
  });
});

describe("error disclosure", () => {
  it("does not return unexpected exception messages", async () => {
    app = buildServer({ logger: false });
    app.get("/test-error", async () => {
      throw new Error("database password=super-secret");
    });

    const response = await app.inject({
      method: "GET",
      url: "/test-error",
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal server error",
      },
    });
    expect(response.body).not.toContain("super-secret");
  });
});

describe("planned v1 routes", () => {
  it("fails closed when Clerk is not configured", async () => {
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
