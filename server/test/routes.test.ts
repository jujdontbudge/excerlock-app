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
    expect(response.json()).toEqual({
      ok: true,
      version: "0.1.0",
      uptime: expect.any(Number),
    });
    expect(response.json<{ uptime: number }>().uptime).toBeGreaterThanOrEqual(0);
  });
});

describe("planned v1 routes", () => {
  it.each([
    {
      method: "POST" as const,
      url: "/v1/support",
      message: "Support API is not implemented",
    },
    {
      method: "GET" as const,
      url: "/v1/user",
      message: "User API is not implemented",
    },
    {
      method: "GET" as const,
      url: "/v1/vendors",
      message: "Vendors API is not implemented",
    },
  ])("registers $method $url as a typed 501 stub", async ({ method, url, message }) => {
    app = buildServer({ logger: false });

    const response = await app.inject({ method, url });

    expect(response.statusCode).toBe(501);
    expect(response.json()).toEqual({
      error: {
        code: "NOT_IMPLEMENTED",
        message,
      },
    });
  });
});
