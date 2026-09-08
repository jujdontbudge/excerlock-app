import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

async function buildWithSupabaseConfigured(): Promise<FastifyInstance> {
  vi.stubEnv("SUPABASE_URL", "https://hqgqhefftjxwdhqeushr.supabase.co");
  vi.resetModules();
  const { buildServer } = await import("../src/index.js");
  return buildServer({ logger: false });
}

describe("protected routes with Supabase configured", () => {
  it("rejects a request with no Authorization header", async () => {
    app = await buildWithSupabaseConfigured();

    const response = await app.inject({ method: "GET", url: "/v1/user" });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: {
        code: "UNAUTHORIZED",
        message: "Missing Authorization: Bearer <token>",
      },
    });
  });

  it("rejects an invalid bearer token as unauthorized", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ keys: [] })));
    app = await buildWithSupabaseConfigured();

    const response = await app.inject({
      method: "GET",
      url: "/v1/user",
      headers: { authorization: "Bearer not-a-jwt" },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: {
        code: "UNAUTHORIZED",
        message: "Invalid or expired Supabase session",
      },
    });
  });
});
