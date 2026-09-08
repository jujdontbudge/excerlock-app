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

async function buildApp(
  submissions: SupportSubmissionService,
  userId = "user_123",
): Promise<FastifyInstance> {
  const instance = Fastify({ logger: false });
  instance.addHook("onRequest", async (request) => {
    request.authIdentity = { userId, isAnonymous: false };
  });
  await instance.register(createSupportRoutes({ submissions }), {
    prefix: "/v1",
  });
  return instance;
}

describe("support routes", () => {
  it("accepts and persists an authenticated support request", async () => {
    const submit = vi.fn(async () => ({
      submissionId: "support-request-id",
    }));
    app = await buildApp({ submit });

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

  it("requires a title on an idea and rejects anything else", async () => {
    const submit = vi.fn();
    app = await buildApp({ submit });

    const response = await app.inject({
      method: "POST",
      url: "/v1/support",
      payload: { category: "feature", message: "No title supplied." },
    });

    expect({
      status: response.statusCode,
      code: response.json<{ error: { code: string } }>().error.code,
      calls: submit.mock.calls,
    }).toEqual({
      status: 400,
      code: "INVALID_SUPPORT_REQUEST",
      calls: [],
    });
  });

  it("returns a defined response for an authenticated user absent from storage", async () => {
    app = await buildApp(
      {
        submit: vi.fn(async () => {
          throw new SupportUserNotFoundError("missing_user");
        }),
      },
      "missing_user",
    );

    const response = await app.inject({
      method: "POST",
      url: "/v1/support",
      payload: { category: "bug", message: "Permission status is wrong." },
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

  it("has no feature-request listing or voting route left (B17)", async () => {
    app = await buildApp({ submit: vi.fn() });

    const listing = await app.inject({
      method: "GET",
      url: "/v1/feature-requests",
    });
    const vote = await app.inject({
      method: "POST",
      url: "/v1/feature-requests/feature-request-id/votes",
    });

    expect([listing.statusCode, vote.statusCode]).toEqual([404, 404]);
  });
});
