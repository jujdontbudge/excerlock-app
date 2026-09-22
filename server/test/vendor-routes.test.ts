import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createVendorProtectedRoutes,
  createVendorPublicRoutes,
} from "../src/routes/vendors.js";
import {
  VendorClientError,
  type VendorOAuthService,
} from "../src/vendors/index.js";
import {
  createVendorEventFeed,
  type VendorEventFeed,
} from "../src/webhooks/index.js";

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe("vendor OAuth routes", () => {
  it("redirects connect, completes callback, and disconnects", async () => {
    const beginConnection = vi.fn(
      async () => "https://vendor.example/authorize?state=state-123",
    );
    const completeConnection = vi.fn(async () => ({
      vendor: "strava" as const,
      connected: true as const,
    }));
    const disconnect = vi.fn(async () => ({
      vendor: "strava" as const,
      connected: false as const,
    }));
    const service: VendorOAuthService = {
      beginConnection,
      completeConnection,
      disconnect,
      getAccessToken: vi.fn(),
    };

    app = Fastify({ logger: false });
    await app.register(createVendorPublicRoutes({ service }), {
      prefix: "/v1",
    });
    await app.register(
      async (protectedScope) => {
        protectedScope.addHook("onRequest", async (request) => {
          request.clerkIdentity = { userId: "user_123", roles: [] };
        });
        await protectedScope.register(
          createVendorProtectedRoutes({ service }),
        );
      },
      { prefix: "/v1" },
    );

    const connectResponse = await app.inject({
      method: "GET",
      url: "/v1/vendors/strava/connect",
    });
    const callbackResponse = await app.inject({
      method: "GET",
      url: "/v1/vendors/strava/callback?code=auth-code&state=state-123&scope=activity%3Aread_all",
    });
    const disconnectResponse = await app.inject({
      method: "DELETE",
      url: "/v1/vendors/strava",
    });

    expect({
      connect: {
        status: connectResponse.statusCode,
        location: connectResponse.headers.location,
      },
      callback: {
        status: callbackResponse.statusCode,
        body: callbackResponse.json(),
      },
      disconnect: {
        status: disconnectResponse.statusCode,
        body: disconnectResponse.json(),
      },
      calls: {
        begin: beginConnection.mock.calls,
        callback: completeConnection.mock.calls,
        disconnect: disconnect.mock.calls,
      },
    }).toEqual({
      connect: {
        status: 302,
        location: "https://vendor.example/authorize?state=state-123",
      },
      callback: {
        status: 200,
        body: { vendor: "strava", connected: true },
      },
      disconnect: {
        status: 200,
        body: { vendor: "strava", connected: false },
      },
      calls: {
        begin: [["user_123", "strava"]],
        callback: [
          [
            "strava",
            {
              code: "auth-code",
              state: "state-123",
              scope: "activity:read_all",
            },
          ],
        ],
        disconnect: [["user_123", "strava"]],
      },
    });
  });

  it("reads the authenticated device's vendor notifications since a cursor", async () => {
    const readSince = vi.fn(async () => ({
      events: [
        {
          id: "event-2",
          vendor: "whoop" as const,
          eventType: "workout.updated",
          receivedAt: "2026-07-29T19:00:01.000Z",
          payload: { id: "workout-1" },
        },
      ],
      nextCursor: "cursor-2",
    }));
    const eventFeed: VendorEventFeed = { readSince };
    app = Fastify({ logger: false });
    await app.register(
      async (protectedScope) => {
        protectedScope.addHook("onRequest", async (request) => {
          request.clerkIdentity = { userId: "user_123", roles: [] };
        });
        await protectedScope.register(
          createVendorProtectedRoutes({ eventFeed }),
        );
      },
      { prefix: "/v1" },
    );

    const response = await app.inject({
      method: "GET",
      url: "/v1/vendors/events?cursor=cursor-1&limit=25",
    });

    expect({
      status: response.statusCode,
      body: response.json(),
      calls: readSince.mock.calls,
    }).toEqual({
      status: 200,
      body: {
        events: [
          {
            id: "event-2",
            vendor: "whoop",
            eventType: "workout.updated",
            receivedAt: "2026-07-29T19:00:01.000Z",
            payload: { id: "workout-1" },
          },
        ],
        nextCursor: "cursor-2",
      },
      calls: [["user_123", "cursor-1", 25]],
    });
  });
});

describe("neutral identity and tombstones", () => {
  it("reports a declined or replayed OAuth callback as a client error", async () => {
    const completeConnection = vi.fn(async () => {
      throw new VendorClientError(
        "Strava authorization failed: access_denied (The athlete declined access)",
      );
    });
    const service: VendorOAuthService = {
      beginConnection: vi.fn(),
      completeConnection,
      disconnect: vi.fn(),
      getAccessToken: vi.fn(),
    };
    app = Fastify({ logger: false });
    await app.register(createVendorPublicRoutes({ service }), {
      prefix: "/v1",
    });

    const response = await app.inject({
      method: "GET",
      url: "/v1/vendors/strava/callback?error=access_denied&error_description=The+athlete+declined+access&state=state-123",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: {
        code: "VENDOR_REQUEST_INVALID",
        message: "Vendor request is invalid",
      },
    });
  });

  it("reports malformed pagination as a client error", async () => {
    const listWebhookEvents = vi.fn(async () => []);
    app = Fastify({ logger: false });
    await app.register(
      async (protectedScope) => {
        protectedScope.addHook("onRequest", async (request) => {
          request.clerkIdentity = { userId: "user_123", roles: [] };
        });
        await protectedScope.register(
          createVendorProtectedRoutes({
            eventFeed: createVendorEventFeed({ listWebhookEvents }),
          }),
        );
      },
      { prefix: "/v1" },
    );

    const badLimit = await app.inject({
      method: "GET",
      url: "/v1/vendors/events?limit=0",
    });
    const badCursor = await app.inject({
      method: "GET",
      url: "/v1/vendors/events?cursor=not-a-cursor",
    });

    expect([badLimit.statusCode, badCursor.statusCode]).toEqual([400, 400]);
    expect(badLimit.json()).toEqual({
      error: {
        code: "VENDOR_REQUEST_INVALID",
        message: "Vendor request is invalid",
      },
    });
    expect(badCursor.json()).toEqual(badLimit.json());
    expect(listWebhookEvents).not.toHaveBeenCalled();
  });

  it("does not disclose internal vendor errors to the authenticated caller", async () => {
    const readSince = vi.fn(async () => {
      throw new Error("database password=super-secret");
    });
    app = Fastify({ logger: false });
    await app.register(
      async (protectedScope) => {
        protectedScope.addHook("onRequest", async (request) => {
          request.clerkIdentity = { userId: "user_123", roles: [] };
        });
        await protectedScope.register(
          createVendorProtectedRoutes({ eventFeed: { readSince } }),
        );
      },
      { prefix: "/v1" },
    );

    const response = await app.inject({
      method: "GET",
      url: "/v1/vendors/events",
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      error: {
        code: "VENDOR_REQUEST_FAILED",
        message: "Vendor request failed",
      },
    });
  });

  it("does not disclose missing vendor configuration details", async () => {
    const readSince = vi.fn(async () => {
      throw new Error(
        "Strava OAuth is not configured; missing STRAVA_CLIENT_SECRET",
      );
    });
    app = Fastify({ logger: false });
    await app.register(
      async (protectedScope) => {
        protectedScope.addHook("onRequest", async (request) => {
          request.authIdentity = {
            userId: "550e8400-e29b-41d4-a716-446655440000",
            roles: [],
            provider: "supabase",
            isAnonymous: true,
          };
        });
        await protectedScope.register(
          createVendorProtectedRoutes({ eventFeed: { readSince } }),
        );
      },
      { prefix: "/v1" },
    );

    const response = await app.inject({
      method: "GET",
      url: "/v1/vendors/events",
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      error: {
        code: "VENDOR_NOT_CONFIGURED",
        message: "Vendor integration is not configured",
      },
    });
  });

  it("serves unrelated protected routes through neutral Supabase identity", async () => {
    const readSince = vi.fn(async () => ({ events: [], nextCursor: null }));
    app = Fastify({ logger: false });
    await app.register(
      async (protectedScope) => {
        protectedScope.addHook("onRequest", async (request) => {
          request.authIdentity = {
            userId: "550e8400-e29b-41d4-a716-446655440000",
            roles: [],
            provider: "supabase",
            isAnonymous: true,
          };
        });
        await protectedScope.register(
          createVendorProtectedRoutes({ eventFeed: { readSince } }),
        );
      },
      { prefix: "/v1" },
    );
    const response = await app.inject({ method: "GET", url: "/v1/vendors/events" });
    expect(response.statusCode).toBe(200);
    expect(readSince).toHaveBeenCalledWith(
      "550e8400-e29b-41d4-a716-446655440000",
      null,
      50,
    );
  });

  it("keeps legacy clerkIdentity working through the neutral helper", async () => {
    const { requireActiveRouteUserId } = await import(
      "../src/routes/vendorRouteSupport.js"
    );
    const reply = {
      code: vi.fn().mockReturnThis(),
      send: vi.fn(),
    } as unknown as Parameters<typeof requireActiveRouteUserId>[1];
    const userId = await requireActiveRouteUserId(
      { clerkIdentity: { userId: "user_123", roles: [] } } as never,
      reply,
      async () => false,
    );
    expect(userId).toBe("user_123");
  });

  it("rejects tombstoned users with 410 even with a valid JWT", async () => {
    const { requireActiveRouteUserId } = await import(
      "../src/routes/vendorRouteSupport.js"
    );
    let status = 0;
    let body: unknown = null;
    const reply = {
      code(code: number) {
        status = code;
        return this;
      },
      async send(payload: unknown) {
        body = payload;
      },
    } as unknown as Parameters<typeof requireActiveRouteUserId>[1];
    const userId = await requireActiveRouteUserId(
      {
        authIdentity: {
          userId: "550e8400-e29b-41d4-a716-446655440000",
          roles: [],
          provider: "supabase",
          isAnonymous: false,
        },
      } as never,
      reply,
      async () => true,
    );
    expect(userId).toBeNull();
    expect(status).toBe(410);
    expect(body).toEqual({
      error: { code: "ACCOUNT_DELETED", message: "This account has been deleted" },
    });
  });

  it("fails closed when tombstone status cannot be checked", async () => {
    const { requireActiveRouteUserId } = await import(
      "../src/routes/vendorRouteSupport.js"
    );
    const reply = {
      code: vi.fn().mockReturnThis(),
      send: vi.fn(),
    } as unknown as Parameters<typeof requireActiveRouteUserId>[1];
    const userId = await requireActiveRouteUserId(
      {
        authIdentity: {
          userId: "550e8400-e29b-41d4-a716-446655440000",
          roles: [], provider: "supabase", isAnonymous: false,
        },
      } as never,
      reply,
      async () => { throw new Error("database unavailable"); },
    );
    expect(userId).toBeNull();
    expect(reply.code).toHaveBeenCalledWith(503);
    expect(reply.send).toHaveBeenCalledWith({
      error: {
        code: "IDENTITY_UNAVAILABLE",
        message: "Identity status is temporarily unavailable",
      },
    });
  });
});
