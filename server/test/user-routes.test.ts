import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createUserRoutes } from "../src/routes/user.js";
import { IdentityErasureRequestError } from "../src/userDeletion/index.js";

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe("DELETE /v1/user", () => {
  it("deletes the authenticated account", async () => {
    const deleteAccount = vi.fn(async () => undefined);
    app = Fastify({ logger: false });
    app.addHook("onRequest", async (request) => {
      request.clerkIdentity = { userId: "user_123", roles: [] };
    });
    await app.register(
      createUserRoutes({ deletion: { deleteAccount } }),
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
      request.clerkIdentity = { userId: "user_123", roles: [] };
    });
    await app.register(
      createUserRoutes({
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
