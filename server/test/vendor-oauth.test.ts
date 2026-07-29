import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { parseEnv } from "../src/env.js";
import {
  createVendorOAuthService,
  requireVendorTokenCipher,
  type NewVendorConnectionRecord,
  type NewVendorOAuthStateRecord,
  type NewVendorTokenRecord,
  type Vendor,
  type VendorHttpClient,
  type VendorHttpRequest,
  type VendorHttpResponse,
  type VendorOAuthStateRepository,
} from "../src/vendors/index.js";

const environment = parseEnv({
  VENDOR_OAUTH_CALLBACK_BASE_URL: "https://api.excerlock.com/",
  VENDOR_TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
  STRAVA_CLIENT_ID: "strava-id",
  STRAVA_CLIENT_SECRET: "strava-secret",
  OURA_CLIENT_ID: "oura-id",
  OURA_CLIENT_SECRET: "oura-secret",
  WHOOP_CLIENT_ID: "whoop-id",
  WHOOP_CLIENT_SECRET: "whoop-secret",
  POLAR_CLIENT_ID: "polar-id",
  POLAR_CLIENT_SECRET: "polar-secret",
});

class CapturingStateRepository implements VendorOAuthStateRepository {
  readonly states: NewVendorOAuthStateRecord[] = [];
  readonly connections: NewVendorConnectionRecord[] = [];
  readonly tokenUpdates: {
    connectionId: string;
    tokens: NewVendorTokenRecord;
  }[] = [];
  readonly deletedConnectionIds: string[] = [];

  async saveOAuthState(state: NewVendorOAuthStateRecord): Promise<void> {
    this.states.push(state);
  }

  async consumeOAuthState(
    stateHash: string,
    vendor: Vendor,
    now: Date,
  ): Promise<NewVendorOAuthStateRecord | null> {
    const index = this.states.findIndex(
      (state) => state.stateHash === stateHash && state.vendor === vendor,
    );
    if (index < 0) {
      return null;
    }

    const [state] = this.states.splice(index, 1);
    return state && state.expiresAt > now ? state : null;
  }

  async upsertConnection(
    connection: NewVendorConnectionRecord,
  ): Promise<void> {
    this.connections.push(connection);
  }

  async findConnection(
    userId: string,
    vendor: Vendor,
  ): Promise<NewVendorConnectionRecord | null> {
    return (
      this.connections.find(
        (connection) =>
          connection.userId === userId && connection.vendor === vendor,
      ) ?? null
    );
  }

  async updateConnectionTokens(
    connectionId: string,
    tokens: NewVendorTokenRecord,
  ): Promise<void> {
    const connection = this.connections.find(
      (candidate) => candidate.id === connectionId,
    );
    if (!connection) {
      throw new Error("Connection not found");
    }
    connection.accessTokenCiphertext = tokens.accessTokenCiphertext;
    connection.refreshTokenCiphertext = tokens.refreshTokenCiphertext;
    connection.accessTokenExpiresAt = tokens.accessTokenExpiresAt;
    this.tokenUpdates.push({ connectionId, tokens });
  }

  async deleteConnection(connectionId: string): Promise<void> {
    const index = this.connections.findIndex(
      (connection) => connection.id === connectionId,
    );
    if (index >= 0) {
      this.connections.splice(index, 1);
    }
    this.deletedConnectionIds.push(connectionId);
  }
}

class StubHttpClient implements VendorHttpClient {
  readonly requests: VendorHttpRequest[] = [];

  constructor(private readonly responses: readonly VendorHttpResponse[]) {}

  async request(request: VendorHttpRequest): Promise<VendorHttpResponse> {
    this.requests.push(request);
    const response = this.responses[this.requests.length - 1];
    if (!response) {
      throw new Error(`Unexpected HTTP request to ${request.url}`);
    }
    return response;
  }
}

const cases = [
  {
    vendor: "strava",
    origin: "https://www.strava.com",
    path: "/oauth/authorize",
    scope: "activity:read_all",
    extras: { approval_prompt: "auto" },
  },
  {
    vendor: "oura",
    origin: "https://cloud.ouraring.com",
    path: "/oauth/authorize",
    scope: "daily workout",
    extras: {},
  },
  {
    vendor: "whoop",
    origin: "https://api.prod.whoop.com",
    path: "/oauth/oauth2/auth",
    scope: "offline read:workout read:cycles read:profile",
    extras: {},
  },
  {
    vendor: "polar",
    origin: "https://flow.polar.com",
    path: "/oauth2/authorization",
    scope: "accesslink.read_all",
    extras: {},
  },
] as const satisfies readonly {
  vendor: Vendor;
  origin: string;
  path: string;
  scope: string;
  extras: Readonly<Record<string, string>>;
}[];

describe("vendor OAuth connect", () => {
  it.each(cases)(
    "constructs the documented $vendor authorization redirect",
    async ({ vendor, origin, path, scope, extras }) => {
      const repository = new CapturingStateRepository();
      const rawState = `${vendor}-state-12345678`;
      const service = createVendorOAuthService({
        environment,
        repository,
        now: () => new Date("2026-07-29T19:00:00.000Z"),
        randomState: () => rawState,
      });

      const redirect = new URL(
        await service.beginConnection("user_123", vendor),
      );

      expect({
        origin: redirect.origin,
        path: redirect.pathname,
        clientId: redirect.searchParams.get("client_id"),
        redirectUri: redirect.searchParams.get("redirect_uri"),
        responseType: redirect.searchParams.get("response_type"),
        scope: redirect.searchParams.get("scope"),
        state: redirect.searchParams.get("state"),
        extras: Object.fromEntries(
          Object.keys(extras).map((key) => [
            key,
            redirect.searchParams.get(key),
          ]),
        ),
        storedState: repository.states,
      }).toEqual({
        origin,
        path,
        clientId: `${vendor}-id`,
        redirectUri: `https://api.excerlock.com/v1/vendors/${vendor}/callback`,
        responseType: "code",
        scope,
        state: rawState,
        extras,
        storedState: [
          {
            stateHash: createHash("sha256").update(rawState).digest("hex"),
            userId: "user_123",
            vendor,
            expiresAt: new Date("2026-07-29T19:10:00.000Z"),
          },
        ],
      });
    },
  );
});

const callbackCases = [
  {
    vendor: "strava",
    responses: [
      {
        status: 200,
        body: {
          token_type: "Bearer",
          access_token: "strava-access",
          refresh_token: "strava-refresh",
          expires_at: 1_785_350_400,
          expires_in: 21_600,
          athlete: { id: 12345 },
          scope: "activity:read_all",
        },
      },
    ],
    externalUserId: "12345",
    expiresAt: new Date("2026-07-29T18:40:00.000Z"),
    scopes: "activity:read_all",
    expectedRequests: [
      {
        method: "POST",
        url: "https://www.strava.com/oauth/token",
        form: {
          client_id: "strava-id",
          client_secret: "strava-secret",
          code: "auth-code",
          grant_type: "authorization_code",
        },
      },
    ],
  },
  {
    vendor: "oura",
    responses: [
      {
        status: 200,
        body: {
          token_type: "bearer",
          access_token: "oura-access",
          refresh_token: "oura-refresh",
          expires_in: 86_400,
        },
      },
      { status: 200, body: { id: "oura-user-id" } },
    ],
    externalUserId: "oura-user-id",
    expiresAt: new Date("2026-07-30T19:00:00.000Z"),
    scopes: "daily workout",
    expectedRequests: [
      {
        method: "POST",
        url: "https://api.ouraring.com/oauth/token",
        form: {
          grant_type: "authorization_code",
          code: "auth-code",
          redirect_uri: "https://api.excerlock.com/v1/vendors/oura/callback",
          client_id: "oura-id",
          client_secret: "oura-secret",
        },
      },
      {
        method: "GET",
        url: "https://api.ouraring.com/v2/usercollection/personal_info",
        authorization: "Bearer oura-access",
      },
    ],
  },
  {
    vendor: "whoop",
    responses: [
      {
        status: 200,
        body: {
          token_type: "bearer",
          access_token: "whoop-access",
          refresh_token: "whoop-refresh",
          expires_in: 3_600,
          scope: "offline read:workout read:cycles read:profile",
        },
      },
      { status: 200, body: { user_id: 67890 } },
    ],
    externalUserId: "67890",
    expiresAt: new Date("2026-07-29T20:00:00.000Z"),
    scopes: "offline read:workout read:cycles read:profile",
    expectedRequests: [
      {
        method: "POST",
        url: "https://api.prod.whoop.com/oauth/oauth2/token",
        form: {
          grant_type: "authorization_code",
          code: "auth-code",
          client_id: "whoop-id",
          client_secret: "whoop-secret",
          redirect_uri:
            "https://api.excerlock.com/v1/vendors/whoop/callback",
        },
      },
      {
        method: "GET",
        url: "https://api.prod.whoop.com/developer/v2/user/profile/basic",
        authorization: "Bearer whoop-access",
      },
    ],
  },
  {
    vendor: "polar",
    responses: [
      {
        status: 200,
        body: {
          access_token: "polar-access",
          token_type: "bearer",
          expires_in: 31_535_999,
          x_user_id: 24680,
        },
      },
      { status: 201, body: { "polar-user-id": 24680 } },
    ],
    externalUserId: "24680",
    expiresAt: null,
    scopes: "accesslink.read_all",
    expectedRequests: [
      {
        method: "POST",
        url: "https://polarremote.com/v2/oauth2/token",
        form: {
          grant_type: "authorization_code",
          code: "auth-code",
          redirect_uri: "https://api.excerlock.com/v1/vendors/polar/callback",
        },
        authorization: `Basic ${Buffer.from("polar-id:polar-secret").toString("base64")}`,
      },
      {
        method: "POST",
        url: "https://www.polaraccesslink.com/v3/users",
        json: { "member-id": "user_123" },
        authorization: "Bearer polar-access",
      },
    ],
  },
] as const satisfies readonly {
  vendor: Vendor;
  responses: readonly VendorHttpResponse[];
  externalUserId: string;
  expiresAt: Date | null;
  scopes: string;
  expectedRequests: readonly Record<string, unknown>[];
}[];

function observableRequest(request: VendorHttpRequest): Record<string, unknown> {
  const contentType = request.headers?.["content-type"];
  return {
    method: request.method,
    url: request.url,
    ...(request.headers?.authorization
      ? { authorization: request.headers.authorization }
      : {}),
    ...(contentType === "application/x-www-form-urlencoded"
      ? { form: Object.fromEntries(new URLSearchParams(request.body)) }
      : {}),
    ...(contentType === "application/json"
      ? { json: JSON.parse(request.body ?? "null") as unknown }
      : {}),
  };
}

describe("vendor OAuth callback", () => {
  it.each(callbackCases)(
    "exchanges and encrypts the documented $vendor token response",
    async ({
      vendor,
      responses,
      externalUserId,
      expiresAt,
      scopes,
      expectedRequests,
    }) => {
      const repository = new CapturingStateRepository();
      const http = new StubHttpClient(responses);
      const capture = vi.fn();
      const service = createVendorOAuthService({
        environment,
        repository,
        http,
        analytics: { capture },
        now: () => new Date("2026-07-29T19:00:00.000Z"),
        randomState: () => `${vendor}-state-12345678`,
        randomId: () => `${vendor}-connection-id`,
      });
      const state = new URL(
        await service.beginConnection("user_123", vendor),
      ).searchParams.get("state");

      await service.completeConnection(vendor, {
        code: "auth-code",
        state: state ?? "",
        scope: scopes,
      });

      const connection = repository.connections[0];
      expect(connection).toBeDefined();
      const cipher = requireVendorTokenCipher(environment);
      expect({
        ...connection,
        accessTokenCiphertext: cipher.decrypt(
          connection?.accessTokenCiphertext ?? "",
        ),
        refreshTokenCiphertext: connection?.refreshTokenCiphertext
          ? cipher.decrypt(connection.refreshTokenCiphertext)
          : null,
        requests: http.requests.map(observableRequest),
        analytics: capture.mock.calls,
      }).toEqual({
        id: `${vendor}-connection-id`,
        userId: "user_123",
        vendor,
        externalUserId,
        accessTokenCiphertext: `${vendor}-access`,
        refreshTokenCiphertext:
          vendor === "polar" ? null : `${vendor}-refresh`,
        accessTokenExpiresAt: expiresAt,
        scopes,
        requests: expectedRequests,
        analytics: [
          ["user_123", "vendor_connected", { vendor }],
        ],
      });
    },
  );

  it("rejects missing, denied, and replayed callbacks before token exchange", async () => {
    const repository = new CapturingStateRepository();
    const http = new StubHttpClient([]);
    const capture = vi.fn();
    const service = createVendorOAuthService({
      environment,
      repository,
      http,
      analytics: { capture },
      now: () => new Date("2026-07-29T19:00:00.000Z"),
      randomState: () => "strava-state-12345678",
    });

    await expect(
      service.completeConnection("strava", {
        code: "auth-code",
        state: "",
      }),
    ).rejects.toThrow("OAuth callback is missing its state");

    const state = new URL(
      await service.beginConnection("user_123", "strava"),
    ).searchParams.get("state");
    await expect(
      service.completeConnection("strava", {
        error: "access_denied",
        errorDescription: "The athlete declined access",
        state: state ?? "",
      }),
    ).rejects.toThrow(
      "Strava authorization failed: access_denied (The athlete declined access)",
    );
    await expect(
      service.completeConnection("strava", {
        code: "auth-code",
        state: state ?? "",
      }),
    ).rejects.toThrow("OAuth state is invalid, expired, or already used");

    expect({
      requests: http.requests,
      connections: repository.connections,
      analytics: capture.mock.calls,
    }).toEqual({
      requests: [],
      connections: [],
      analytics: [],
    });
  });

  it("surfaces an upstream callback exchange error without storing a connection", async () => {
    const repository = new CapturingStateRepository();
    const http = new StubHttpClient([
      {
        status: 401,
        body: { message: "invalid authorization code" },
      },
    ]);
    const capture = vi.fn();
    const service = createVendorOAuthService({
      environment,
      repository,
      http,
      analytics: { capture },
      now: () => new Date("2026-07-29T19:00:00.000Z"),
      randomState: () => "strava-state-12345678",
    });
    const state = new URL(
      await service.beginConnection("user_123", "strava"),
    ).searchParams.get("state");

    await expect(
      service.completeConnection("strava", {
        code: "rejected-code",
        state: state ?? "",
      }),
    ).rejects.toThrow(
      "Strava token exchange failed with upstream HTTP 401",
    );
    expect({
      request: observableRequest(http.requests[0] as VendorHttpRequest),
      connections: repository.connections,
      analytics: capture.mock.calls,
    }).toEqual({
      request: {
        method: "POST",
        url: "https://www.strava.com/oauth/token",
        form: {
          client_id: "strava-id",
          client_secret: "strava-secret",
          code: "rejected-code",
          grant_type: "authorization_code",
        },
      },
      connections: [],
      analytics: [],
    });
  });
});

const refreshCases = [
  {
    vendor: "strava",
    response: {
      status: 200,
      body: {
        access_token: "strava-next-access",
        refresh_token: "strava-next-refresh",
        expires_at: 1_785_524_400,
        expires_in: 86_400,
      },
    },
    expectedExpiresAt: new Date("2026-07-31T19:00:00.000Z"),
    expectedRequest: {
      method: "POST",
      url: "https://www.strava.com/oauth/token",
      form: {
        client_id: "strava-id",
        client_secret: "strava-secret",
        grant_type: "refresh_token",
        refresh_token: "strava-old-refresh",
      },
    },
  },
  {
    vendor: "oura",
    response: {
      status: 200,
      body: {
        access_token: "oura-next-access",
        refresh_token: "oura-next-refresh",
        expires_in: 86_400,
      },
    },
    expectedExpiresAt: new Date("2026-07-31T19:00:00.000Z"),
    expectedRequest: {
      method: "POST",
      url: "https://api.ouraring.com/oauth/token",
      form: {
        grant_type: "refresh_token",
        refresh_token: "oura-old-refresh",
        client_id: "oura-id",
        client_secret: "oura-secret",
      },
    },
  },
  {
    vendor: "whoop",
    response: {
      status: 200,
      body: {
        access_token: "whoop-next-access",
        refresh_token: "whoop-next-refresh",
        expires_in: 3_600,
        scope: "offline",
        token_type: "bearer",
      },
    },
    expectedExpiresAt: new Date("2026-07-30T20:00:00.000Z"),
    expectedRequest: {
      method: "POST",
      url: "https://api.prod.whoop.com/oauth/oauth2/token",
      form: {
        grant_type: "refresh_token",
        refresh_token: "whoop-old-refresh",
        client_id: "whoop-id",
        client_secret: "whoop-secret",
        scope: "offline",
      },
    },
  },
] as const satisfies readonly {
  vendor: Exclude<Vendor, "polar">;
  response: VendorHttpResponse;
  expectedExpiresAt: Date;
  expectedRequest: Record<string, unknown>;
}[];

describe("vendor token refresh", () => {
  it.each(refreshCases)(
    "atomically stores the rotated $vendor token pair",
    async ({ vendor, response, expectedExpiresAt, expectedRequest }) => {
      const repository = new CapturingStateRepository();
      const cipher = requireVendorTokenCipher(environment);
      await repository.upsertConnection({
        id: `${vendor}-connection-id`,
        userId: "user_123",
        vendor,
        externalUserId: `${vendor}-external-user`,
        accessTokenCiphertext: cipher.encrypt(`${vendor}-old-access`),
        refreshTokenCiphertext: cipher.encrypt(`${vendor}-old-refresh`),
        accessTokenExpiresAt: new Date("2026-07-30T18:00:00.000Z"),
        scopes: "fixture-scope",
      });
      const http = new StubHttpClient([response]);
      const service = createVendorOAuthService({
        environment,
        repository,
        http,
        now: () => new Date("2026-07-30T19:00:00.000Z"),
      });

      const accessToken = await service.getAccessToken("user_123", vendor);

      const stored = repository.connections[0];
      expect({
        accessToken,
        storedAccessToken: cipher.decrypt(
          stored?.accessTokenCiphertext ?? "",
        ),
        storedRefreshToken: cipher.decrypt(
          stored?.refreshTokenCiphertext ?? "",
        ),
        storedExpiresAt: stored?.accessTokenExpiresAt,
        updateCount: repository.tokenUpdates.length,
        request: observableRequest(http.requests[0] as VendorHttpRequest),
      }).toEqual({
        accessToken: `${vendor}-next-access`,
        storedAccessToken: `${vendor}-next-access`,
        storedRefreshToken: `${vendor}-next-refresh`,
        storedExpiresAt: expectedExpiresAt,
        updateCount: 1,
        request: expectedRequest,
      });
    },
  );

  it("returns Polar's non-expiring token without a refresh request", async () => {
    const repository = new CapturingStateRepository();
    const cipher = requireVendorTokenCipher(environment);
    await repository.upsertConnection({
      id: "polar-connection-id",
      userId: "user_123",
      vendor: "polar",
      externalUserId: "24680",
      accessTokenCiphertext: cipher.encrypt("polar-access"),
      refreshTokenCiphertext: null,
      accessTokenExpiresAt: null,
      scopes: "accesslink.read_all",
    });
    const http = new StubHttpClient([]);
    const service = createVendorOAuthService({
      environment,
      repository,
      http,
      now: () => new Date("2026-07-30T19:00:00.000Z"),
    });

    await expect(
      service.getAccessToken("user_123", "polar"),
    ).resolves.toBe("polar-access");
    expect({
      requests: http.requests,
      tokenUpdates: repository.tokenUpdates,
    }).toEqual({ requests: [], tokenUpdates: [] });
  });
});

const disconnectCases = [
  {
    vendor: "strava",
    status: 200,
    expectedRequest: {
      method: "POST",
      url: "https://www.strava.com/oauth/revoke",
      authorization: `Basic ${Buffer.from("strava-id:strava-secret").toString("base64")}`,
      form: {
        token: "strava-access",
        token_type_hint: "access_token",
      },
    },
  },
  {
    vendor: "oura",
    status: 200,
    expectedRequest: {
      method: "POST",
      url: "https://api.ouraring.com/oauth/revoke?access_token=oura-access",
    },
  },
  {
    vendor: "whoop",
    status: 204,
    expectedRequest: {
      method: "DELETE",
      url: "https://api.prod.whoop.com/developer/v2/user/access",
      authorization: "Bearer whoop-access",
    },
  },
  {
    vendor: "polar",
    status: 204,
    expectedRequest: {
      method: "DELETE",
      url: "https://www.polaraccesslink.com/v3/users/polar-external-user",
      authorization: "Bearer polar-access",
    },
  },
] as const satisfies readonly {
  vendor: Vendor;
  status: number;
  expectedRequest: Record<string, unknown>;
}[];

describe("vendor disconnect", () => {
  it.each(disconnectCases)(
    "revokes $vendor before deleting the local connection",
    async ({ vendor, status, expectedRequest }) => {
      const repository = new CapturingStateRepository();
      const cipher = requireVendorTokenCipher(environment);
      await repository.upsertConnection({
        id: `${vendor}-connection-id`,
        userId: "user_123",
        vendor,
        externalUserId: `${vendor}-external-user`,
        accessTokenCiphertext: cipher.encrypt(`${vendor}-access`),
        refreshTokenCiphertext:
          vendor === "polar"
            ? null
            : cipher.encrypt(`${vendor}-refresh`),
        accessTokenExpiresAt: null,
        scopes: "fixture-scope",
      });
      const http = new StubHttpClient([{ status, body: null }]);
      const capture = vi.fn();
      const service = createVendorOAuthService({
        environment,
        repository,
        http,
        analytics: { capture },
      });

      await expect(
        service.disconnect("user_123", vendor),
      ).resolves.toEqual({ vendor, connected: false });
      expect({
        request: observableRequest(http.requests[0] as VendorHttpRequest),
        remainingConnections: repository.connections,
        deletedConnectionIds: repository.deletedConnectionIds,
        analytics: capture.mock.calls,
      }).toEqual({
        request: expectedRequest,
        remainingConnections: [],
        deletedConnectionIds: [`${vendor}-connection-id`],
        analytics: [
          ["user_123", "vendor_disconnected", { vendor }],
        ],
      });
    },
  );
});
