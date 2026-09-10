import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DeletedIdentityError } from "../src/identity/index.js";
import { createUserRoutes } from "../src/routes/user.js";
import { IdentityErasureRequestError } from "../src/userDeletion/index.js";

let app: FastifyInstance | undefined;
const identity = { ensureActiveUser: vi.fn(async () => undefined) };

afterEach(async () => {
  await app?.close();
  app = undefined;
  vi.clearAllMocks();
});

const SUPABASE_UUID = "550e8400-e29b-41d4-a716-446655440000";

function authHook(
  kind: "supabase" | "clerk",
  userId: string = SUPABASE_UUID,
) {
  return async (request: { authIdentity?: unknown; clerkIdentity?: unknown }) => {
    if (kind === "supabase") {
      request.authIdentity = {
        userId,
        roles: [],
        provider: "supabase",
        isAnonymous: true,
      };
      request.clerkIdentity = { userId, roles: [] };
    } else {
      request.clerkIdentity = { userId, roles: [] };
    }
  };
}

describe("DELETE /v1/user", () => {
  it("deletes the authenticated account", async () => {
    const deleteAccount = vi.fn(async () => undefined);
    app = Fastify({ logger: false });
    app.addHook("onRequest", authHook("clerk", "user_123"));
    await app.register(
      createUserRoutes({ deletion: { deleteAccount }, identity }),
      { prefix: "/v1" },
    );

    const response = await app.inject({
      method: "DELETE",
      url: "/v1/user",
    });

    expect({ status: response.statusCode, calls: deleteAccount.mock.calls }).toEqual({
      status: 204,
      calls: [["user_123"]],
    });
  });

  it("deletes a canonical anonymous Supabase identity via neutral auth", async () => {
    const deleteAccount = vi.fn(async () => undefined);
    app = Fastify({ logger: false });
    app.addHook("onRequest", authHook("supabase", SUPABASE_UUID));
    await app.register(
      createUserRoutes({ deletion: { deleteAccount }, identity }),
      { prefix: "/v1" },
    );
    const response = await app.inject({ method: "DELETE", url: "/v1/user" });
    expect({ status: response.statusCode, calls: deleteAccount.mock.calls }).toEqual({
      status: 204,
      calls: [[SUPABASE_UUID]],
    });
  });

  it("stays retryable for a tombstoned caller (no 410 on DELETE)", async () => {
    // DELETE must resume the durable workflow even when the JWT is still
    // valid after tombstoning; the worker covers the no-token case.
    const deleteAccount = vi.fn(async () => undefined);
    const tombstonedIdentity = {
      ensureActiveUser: vi.fn(async () => {
        throw new DeletedIdentityError();
      }),
    };
    app = Fastify({ logger: false });
    app.addHook("onRequest", authHook("supabase", SUPABASE_UUID));
    await app.register(
      createUserRoutes({
        deletion: { deleteAccount },
        identity: tombstonedIdentity,
      }),
      { prefix: "/v1" },
    );
    const response = await app.inject({ method: "DELETE", url: "/v1/user" });
    // DELETE ignores the identity tombstone check used by PUT and resumes.
    expect(response.statusCode).toBe(204);
    expect(deleteAccount).toHaveBeenCalledWith(SUPABASE_UUID);
  });

  it("returns a retryable response without exposing processor details", async () => {
    app = Fastify({ logger: false });
    app.addHook("onRequest", authHook("clerk", "user_123"));
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
    expect(JSON.stringify(response.json())).not.toContain("PostHog-secret");
  });
});

describe("PUT /v1/user", () => {
  it("provisions the authenticated identity idempotently", async () => {
    const ensureActiveUser = vi.fn(async () => undefined);
    app = Fastify({ logger: false });
    app.addHook("onRequest", authHook("clerk", "user_123"));
    await app.register(
      createUserRoutes({
        deletion: { deleteAccount: vi.fn() },
        identity: { ensureActiveUser },
      }),
      { prefix: "/v1" },
    );

    const response = await app.inject({ method: "PUT", url: "/v1/user" });

    expect({ status: response.statusCode, calls: ensureActiveUser.mock.calls }).toEqual({
      status: 204,
      calls: [["user_123"]],
    });
  });

  it("provisions a canonical Supabase UUID via neutral identity", async () => {
    const ensureActiveUser = vi.fn(async () => undefined);
    app = Fastify({ logger: false });
    app.addHook("onRequest", authHook("supabase", SUPABASE_UUID));
    await app.register(
      createUserRoutes({
        deletion: { deleteAccount: vi.fn() },
        identity: { ensureActiveUser },
      }),
      { prefix: "/v1" },
    );
    const response = await app.inject({ method: "PUT", url: "/v1/user" });
    expect({ status: response.statusCode, calls: ensureActiveUser.mock.calls }).toEqual({
      status: 204,
      calls: [[SUPABASE_UUID]],
    });
  });

  it("rejects a tombstoned user with 410 even with a valid JWT", async () => {
    const ensureActiveUser = vi.fn(async () => {
      throw new DeletedIdentityError();
    });
    app = Fastify({ logger: false });
    app.addHook("onRequest", authHook("supabase", SUPABASE_UUID));
    await app.register(
      createUserRoutes({
        deletion: { deleteAccount: vi.fn() },
        identity: { ensureActiveUser },
      }),
      { prefix: "/v1" },
    );
    const response = await app.inject({ method: "PUT", url: "/v1/user" });
    expect({ status: response.statusCode, body: response.json() }).toEqual({
      status: 410,
      body: {
        error: { code: "ACCOUNT_DELETED", message: "This account has been deleted" },
      },
    });
  });

  it("never accepts a userId from the client body", async () => {
    const ensureActiveUser = vi.fn(async () => undefined);
    app = Fastify({ logger: false });
    app.addHook("onRequest", authHook("supabase", SUPABASE_UUID));
    await app.register(
      createUserRoutes({
        deletion: { deleteAccount: vi.fn() },
        identity: { ensureActiveUser },
      }),
      { prefix: "/v1" },
    );
    const attackerId = "11111111-1111-1111-1111-111111111111";
    const response = await app.inject({
      method: "PUT",
      url: "/v1/user",
      payload: { userId: attackerId, id: attackerId },
    });
    expect(response.statusCode).toBe(204);
    // Verified token wins; body is ignored by design (no migration endpoint).
    expect(ensureActiveUser).toHaveBeenCalledWith(SUPABASE_UUID);
    expect(ensureActiveUser).not.toHaveBeenCalledWith(attackerId);
  });

  it("requires authentication", async () => {
    app = Fastify({ logger: false });
    await app.register(
      createUserRoutes({
        deletion: { deleteAccount: vi.fn() },
        identity: { ensureActiveUser: vi.fn() },
      }),
      { prefix: "/v1" },
    );
    const put = await app.inject({ method: "PUT", url: "/v1/user" });
    expect(put.statusCode).toBe(401);
    const del = await app.inject({ method: "DELETE", url: "/v1/user" });
    expect(del.statusCode).toBe(401);
  });
});
