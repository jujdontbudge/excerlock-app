import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createSupportRoutes } from "../src/routes/support.js";
import {
  type SupportSubmissionService,
  SupportUserNotFoundError,
} from "../src/support/index.js";

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe("support routes", () => {
  it("accepts and persists an authenticated support request", async () => {
    const submit = vi.fn(async () => ({
      submissionId: "support-request-id",
    }));
    const service: SupportSubmissionService = { submit };
    app = Fastify({ logger: false });
    app.addHook("onRequest", async (request) => {
      request.clerkIdentity = { userId: "user_123", roles: [] };
    });
    await app.register(createSupportRoutes({ service }), {
      prefix: "/v1",
    });

    const response = await app.inject({
      method: "POST",
      url: "/v1/support",
      payload: {
        category: "support",
        message: "My workout did not unlock my apps.",
      },
    });

    expect({
      status: response.statusCode,
      body: response.json(),
      calls: submit.mock.calls,
    }).toEqual({
      status: 201,
      body: { submissionId: "support-request-id" },
      calls: [
        [
          "user_123",
          {
            category: "support",
            message: "My workout did not unlock my apps.",
          },
        ],
      ],
    });
  });

  it("returns a defined response for an authenticated user absent from storage", async () => {
    const service: SupportSubmissionService = {
      submit: vi.fn(async () => {
        throw new SupportUserNotFoundError("missing_user");
      }),
    };
    app = Fastify({ logger: false });
    app.addHook("onRequest", async (request) => {
      request.clerkIdentity = { userId: "missing_user", roles: [] };
    });
    await app.register(createSupportRoutes({ service }), {
      prefix: "/v1",
    });

    const response = await app.inject({
      method: "POST",
      url: "/v1/support",
      payload: {
        category: "bug",
        message: "Permission status is wrong.",
      },
    });

    expect({
      status: response.statusCode,
      body: response.json(),
    }).toEqual({
      status: 404,
      body: {
        error: {
          code: "USER_NOT_FOUND",
          message: "The authenticated user does not exist",
        },
      },
    });
  });
});
