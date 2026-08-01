import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createUserRoutes } from "../src/routes/user.js";

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
});
