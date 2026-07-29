import { createHash, randomBytes } from "node:crypto";
import type { Environment } from "../env.js";
import { requireVendorOAuthConfiguration } from "./configuration.js";
import type {
  NewVendorOAuthStateRecord,
  VendorOAuthStateRepository,
} from "./repository.js";
import type { Vendor } from "./types.js";

const STATE_TTL_MS = 10 * 60 * 1_000;

interface AuthorizationShape {
  endpoint: string;
  scope: string;
  extraParameters?: Readonly<Record<string, string>>;
}

const AUTHORIZATION_SHAPES: Readonly<Record<Vendor, AuthorizationShape>> = {
  strava: {
    endpoint: "https://www.strava.com/oauth/authorize",
    scope: "activity:read_all",
    extraParameters: { approval_prompt: "auto" },
  },
  oura: {
    endpoint: "https://cloud.ouraring.com/oauth/authorize",
    scope: "daily workout",
  },
  whoop: {
    endpoint: "https://api.prod.whoop.com/oauth/oauth2/auth",
    scope: "offline read:workout read:cycles read:profile",
  },
  polar: {
    endpoint: "https://flow.polar.com/oauth2/authorization",
    scope: "accesslink.read_all",
  },
};

export interface VendorOAuthServiceOptions {
  environment: Environment;
  repository: VendorOAuthStateRepository;
  now?: () => Date;
  randomState?: () => string;
}

export interface VendorOAuthService {
  beginConnection(userId: string, vendor: Vendor): Promise<string>;
}

function callbackUrl(baseUrl: string, vendor: Vendor): string {
  try {
    return new URL(`/v1/vendors/${vendor}/callback`, baseUrl).toString();
  } catch {
    throw new Error(
      "VENDOR_OAUTH_CALLBACK_BASE_URL must be a valid absolute URL",
    );
  }
}

function hashState(state: string): string {
  return createHash("sha256").update(state).digest("hex");
}

export function createVendorOAuthService(
  options: VendorOAuthServiceOptions,
): VendorOAuthService {
  const now = options.now ?? (() => new Date());
  const generateState =
    options.randomState ?? (() => randomBytes(32).toString("base64url"));

  return {
    async beginConnection(userId, vendor) {
      const configuration = requireVendorOAuthConfiguration(
        options.environment,
        vendor,
      );
      const shape = AUTHORIZATION_SHAPES[vendor];
      const state = generateState();
      const redirectUri = callbackUrl(configuration.callbackBaseUrl, vendor);
      const stateRecord: NewVendorOAuthStateRecord = {
        stateHash: hashState(state),
        userId,
        vendor,
        expiresAt: new Date(now().getTime() + STATE_TTL_MS),
      };
      await options.repository.saveOAuthState(stateRecord);

      const authorizationUrl = new URL(shape.endpoint);
      authorizationUrl.searchParams.set("client_id", configuration.clientId);
      authorizationUrl.searchParams.set("redirect_uri", redirectUri);
      authorizationUrl.searchParams.set("response_type", "code");
      authorizationUrl.searchParams.set("scope", shape.scope);
      authorizationUrl.searchParams.set("state", state);
      for (const [name, value] of Object.entries(
        shape.extraParameters ?? {},
      )) {
        authorizationUrl.searchParams.set(name, value);
      }

      return authorizationUrl.toString();
    },
  };
}
