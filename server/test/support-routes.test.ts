import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createSupportRoutes } from "../src/routes/support.js";
import {
  type FeatureRequestService,
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
    const featureRequests: FeatureRequestService = {
      list: vi.fn(async () => ({ featureRequests: [] })),
    };
    app = Fastify({ logger: false });
    app.addHook("onRequest", async (request) => {
      request.clerkIdentity = { userId: "user_123", roles: [] };
    });
    await app.register(createSupportRoutes({ service, featureRequests }), {
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
    const featureRequests: FeatureRequestService = {
      list: vi.fn(async () => ({ featureRequests: [] })),
    };
    app = Fastify({ logger: false });
    app.addHook("onRequest", async (request) => {
      request.clerkIdentity = { userId: "missing_user", roles: [] };
    });
    await app.register(createSupportRoutes({ service, featureRequests }), {
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

  it("lists feature requests with counts and the authenticated user's vote state", async () => {
    const service: SupportSubmissionService = {
      submit: vi.fn(),
    };
    const list = vi.fn(async () => ({
      featureRequests: [
        {
          id: "feature-request-id",
          submissionId: "support-request-id",
          title: "Home Screen widget",
          message: "Show my balance without opening the app.",
          voteCount: 3,
          hasVoted: true,
          createdAt: new Date("2026-07-29T21:00:00.000Z"),
        },
      ],
    }));
    const featureRequests: FeatureRequestService = { list };
    app = Fastify({ logger: false });
    app.addHook("onRequest", async (request) => {
      request.clerkIdentity = { userId: "user_123", roles: [] };
    });
    await app.register(createSupportRoutes({ service, featureRequests }), {
      prefix: "/v1",
    });

    const response = await app.inject({
      method: "GET",
      url: "/v1/feature-requests",
    });

    expect({
      status: response.statusCode,
      body: response.json(),
      calls: list.mock.calls,
    }).toEqual({
      status: 200,
      body: {
        featureRequests: [
          {
            id: "feature-request-id",
            submissionId: "support-request-id",
            title: "Home Screen widget",
            message: "Show my balance without opening the app.",
            voteCount: 3,
            hasVoted: true,
            createdAt: "2026-07-29T21:00:00.000Z",
          },
        ],
      },
      calls: [["user_123"]],
    });
  });
});
