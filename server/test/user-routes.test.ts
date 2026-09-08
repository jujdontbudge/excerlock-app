import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createUserRoutes } from "../src/routes/user.js";
import { IdentityErasureRequestError } from "../src/userDeletion/index.js";

let app: FastifyInstance | undefined;
const identity = {
  ensureActiveUser: vi.fn(async () => undefined),
  findUser: vi.fn(async () => null),
};

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe("DELETE /v1/user", () => {
  it("deletes the authenticated account", async () => {
    const deleteAccount = vi.fn(async () => undefined);
    app = Fastify({ logger: false });
    app.addHook("onRequest", async (request) => {
      request.authIdentity = { userId: "user_123", isAnonymous: false };
    });
    await app.register(
      createUserRoutes({ deletion: { deleteAccount }, identity }),
      { prefix: "/v1" },
    );

    const response = await app.inject({
      method: "DELETE",
      url: "/v1/user",
    });

    expect({ status: response.statusCode, calls: deleteAccount.mock.calls })
      .toEqual({ status: 204, calls: [["user_123"]] });
  });

  it("returns a retryable response without exposing processor details", async () => {
    app = Fastify({ logger: false });
    app.addHook("onRequest", async (request) => {
      request.authIdentity = { userId: "user_123", isAnonymous: false };
    });
    await app.register(
      createUserRoutes({
        identity,
        deletion: {
          deleteAccount: vi.fn(async () => {
            throw new IdentityErasureRequestError("PostHog");
          }),
        },
      }),
      { prefix: "/v1" },
    );

    const response = await app.inject({
      method: "DELETE",
      url: "/v1/user",
    });

    expect({ status: response.statusCode, body: response.json() }).toEqual({
      status: 502,
      body: {
        error: {
          code: "IDENTITY_ERASURE_FAILED",
          message: "Account deletion is incomplete; retry safely",
        },
      },
    });
  });
});

describe("PUT /v1/user", () => {
  it("provisions the authenticated identity idempotently", async () => {
    const ensureActiveUser = vi.fn(async () => undefined);
    app = Fastify({ logger: false });
    app.addHook("onRequest", async (request) => {
      request.authIdentity = { userId: "user_123", isAnonymous: false };
    });
    await app.register(
      createUserRoutes({
        deletion: { deleteAccount: vi.fn() },
        identity: { ensureActiveUser, findUser: vi.fn(async () => null) },
      }),
      { prefix: "/v1" },
    );

    const response = await app.inject({ method: "PUT", url: "/v1/user" });

    expect({ status: response.statusCode, calls: ensureActiveUser.mock.calls })
      .toEqual({ status: 204, calls: [["user_123"]] });
  });
});

describe("GET /v1/user", () => {
  async function buildApp(
    findUser: () => Promise<{ createdAt: Date; deletedAt: Date | null } | null>,
    isAnonymous: boolean,
  ): Promise<FastifyInstance> {
    const instance = Fastify({ logger: false });
    instance.addHook("onRequest", async (request) => {
      request.authIdentity = { userId: "user_123", isAnonymous };
    });
    await instance.register(
      createUserRoutes({
        deletion: { deleteAccount: vi.fn() },
        identity: { ensureActiveUser: vi.fn(), findUser },
      }),
      { prefix: "/v1" },
    );
    return instance;
  }

  it("reports the provisioned account and the token's anonymity", async () => {
    app = await buildApp(
      async () => ({
        createdAt: new Date("2026-09-01T12:00:00.000Z"),
        deletedAt: null,
      }),
      true,
    );

    const response = await app.inject({ method: "GET", url: "/v1/user" });

    expect({ status: response.statusCode, body: response.json() }).toEqual({
      status: 200,
      body: {
        id: "user_123",
        isAnonymous: true,
        createdAt: "2026-09-01T12:00:00.000Z",
      },
    });
  });

  it("reports a signed-in session as not anonymous", async () => {
    app = await buildApp(
      async () => ({
        createdAt: new Date("2026-09-01T12:00:00.000Z"),
        deletedAt: null,
      }),
      false,
    );

    const response = await app.inject({ method: "GET", url: "/v1/user" });

    expect(response.json<{ isAnonymous: boolean }>().isAnonymous).toBe(false);
  });

  it("answers 404 before the account has been provisioned", async () => {
    app = await buildApp(async () => null, true);

    const response = await app.inject({ method: "GET", url: "/v1/user" });

    expect({
      status: response.statusCode,
      code: response.json<{ error: { code: string } }>().error.code,
    }).toEqual({ status: 404, code: "USER_NOT_FOUND" });
  });

  it("answers 410 for a deletion tombstone rather than resurrecting it", async () => {
    app = await buildApp(
      async () => ({
        createdAt: new Date("2026-09-01T12:00:00.000Z"),
        deletedAt: new Date("2026-09-02T12:00:00.000Z"),
      }),
      false,
    );

    const response = await app.inject({ method: "GET", url: "/v1/user" });

    expect({
      status: response.statusCode,
      code: response.json<{ error: { code: string } }>().error.code,
    }).toEqual({ status: 410, code: "ACCOUNT_DELETED" });
  });

  it("is no longer the 501 stub", async () => {
    app = await buildApp(
      async () => ({
        createdAt: new Date("2026-09-01T12:00:00.000Z"),
        deletedAt: null,
      }),
      false,
    );

    const response = await app.inject({ method: "GET", url: "/v1/user" });

    expect(response.statusCode).not.toBe(501);
  });
});
