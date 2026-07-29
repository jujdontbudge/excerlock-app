import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { parseEnv } from "../src/env.js";
import {
  createVendorOAuthService,
  type NewVendorOAuthStateRecord,
  type Vendor,
  type VendorOAuthStateRepository,
} from "../src/vendors/index.js";

const environment = parseEnv({
  VENDOR_OAUTH_CALLBACK_BASE_URL: "https://api.excerlock.com/",
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

  async saveOAuthState(state: NewVendorOAuthStateRecord): Promise<void> {
    this.states.push(state);
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
