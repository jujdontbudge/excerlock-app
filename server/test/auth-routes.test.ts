import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("protected routes with Clerk configured", () => {
  it("rejects an invalid bearer token as unauthorized", async () => {
    vi.stubEnv("CLERK_SECRET_KEY", "sk_test_example");
    vi.resetModules();
    const { buildServer } = await import("../src/index.js");
    app = buildServer({ logger: false });

    const response = await app.inject({
      method: "GET",
      url: "/v1/user",
      headers: { authorization: "Bearer not-a-jwt" },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: {
        code: "UNAUTHORIZED",
        message: "Invalid or expired Clerk session",
      },
    });
  });
});
