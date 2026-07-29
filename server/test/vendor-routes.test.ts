import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createVendorProtectedRoutes,
  createVendorPublicRoutes,
} from "../src/routes/vendors.js";
import type { VendorOAuthService } from "../src/vendors/index.js";

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
});
