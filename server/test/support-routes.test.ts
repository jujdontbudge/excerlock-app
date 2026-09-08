import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createSupportRoutes } from "../src/routes/support.js";
import {
  type SupportSubmissionService,
  SupportUserNotFoundError,
} from "../src/support/index.js";

let app: FastifyInstance | undefined;

/** The whole privacy-floored bundle P2-T22 §5 specifies, and nothing else. */
const DIAGNOSTICS = {
  appVersion: "1.4.0",
  appBuild: "412",
  iosVersion: "18.2",
  deviceModel: "iPhone15,3",
  entitlementStatus: "active",
  permissions: {
    screenTime: "granted",
    motion: "granted",
    location: "whenInUse",
    health: "notDetermined",
    camera: "denied",
    notifications: "granted",
  },
  ruleCount: 3,
  lastEnforcementResult: "shielded",
} as const;

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

  it("accepts the product categories with a reply address and diagnostics", async () => {
    const submit = vi.fn(async () => ({ submissionId: "idea-id" }));
    app = await buildApp({ submit });

    const response = await app.inject({
      method: "POST",
      url: "/v1/support",
      payload: {
        category: "idea",
        message: "Let me pause a condition for a week.",
        replyTo: "someone@example.com",
        diagnostics: DIAGNOSTICS,
      },
    });

    expect({
      status: response.statusCode,
      calls: submit.mock.calls,
    }).toEqual({
      status: 201,
      calls: [
        [
          "user_123",
          {
            category: "idea",
            message: "Let me pause a condition for a week.",
            replyTo: "someone@example.com",
            diagnostics: DIAGNOSTICS,
          },
        ],
      ],
    });
  });

  it("rejects a reply address that is not an address", async () => {
    const submit = vi.fn();
    app = await buildApp({ submit });

    const response = await app.inject({
      method: "POST",
      url: "/v1/support",
      payload: {
        category: "problem",
        message: "Nothing unlocked.",
        replyTo: "not-an-address",
      },
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

  it("rejects an unknown diagnostics field and never echoes its value", async () => {
    const submit = vi.fn();
    app = await buildApp({ submit });

    const response = await app.inject({
      method: "POST",
      url: "/v1/support",
      payload: {
        category: "problem",
        message: "Nothing unlocked.",
        diagnostics: { ...DIAGNOSTICS, gymName: "Iron Works on 5th" },
      },
    });

    const body = response.json<{ error: { code: string; message: string } }>();

    expect({
      status: response.statusCode,
      code: body.error.code,
      leaked: body.error.message.includes("Iron Works"),
      names: body.error.message.includes("diagnostics"),
      calls: submit.mock.calls,
    }).toEqual({
      status: 400,
      code: "INVALID_SUPPORT_REQUEST",
      leaked: false,
      names: true,
      calls: [],
    });
  });

  it("rejects a message that is only whitespace", async () => {
    const submit = vi.fn();
    app = await buildApp({ submit });

    const response = await app.inject({
      method: "POST",
      url: "/v1/support",
      payload: { category: "question", message: "   " },
    });

    expect({
      status: response.statusCode,
      calls: submit.mock.calls,
    }).toEqual({ status: 400, calls: [] });
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
