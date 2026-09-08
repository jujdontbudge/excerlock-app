import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Environment } from "../env.js";
import {
  requireVendorOAuthConfiguration,
  requireVendorTokenCipher,
} from "./configuration.js";
import {
  fetchVendorHttpClient,
  type VendorHttpClient,
} from "./http.js";
import { VENDOR_ADAPTERS } from "./providers/index.js";
import type {
  NewVendorConnectionRecord,
  NewVendorOAuthStateRecord,
  NewVendorTokenRecord,
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
  randomId?: () => string;
  http?: VendorHttpClient;
}

export interface VendorOAuthCallback {
  code?: string;
  state: string;
  scope?: string;
  error?: string;
  errorDescription?: string;
}

export interface VendorOAuthService {
  beginConnection(userId: string, vendor: Vendor): Promise<string>;
  completeConnection(
    vendor: Vendor,
    callback: VendorOAuthCallback,
  ): Promise<{ vendor: Vendor; connected: true }>;
  getAccessToken(userId: string, vendor: Vendor): Promise<string>;
  disconnect(
    userId: string,
    vendor: Vendor,
  ): Promise<{ vendor: Vendor; connected: false }>;
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
  const generateId = options.randomId ?? randomUUID;
  const http = options.http ?? fetchVendorHttpClient;

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

    async completeConnection(vendor, callback) {
      if (!callback.state) {
        throw new Error("OAuth callback is missing its state");
      }

      const completedAt = now();
      const state = await options.repository.consumeOAuthState(
        hashState(callback.state),
        vendor,
        completedAt,
      );
      if (!state) {
        throw new Error("OAuth state is invalid, expired, or already used");
      }
      if (callback.error) {
        const vendorLabel =
          vendor === "whoop"
            ? "WHOOP"
            : `${vendor[0]?.toUpperCase()}${vendor.slice(1)}`;
        const description = callback.errorDescription
          ? ` (${callback.errorDescription})`
          : "";
        throw new Error(
          `${vendorLabel} authorization failed: ${callback.error}${description}`,
        );
      }
      if (!callback.code) {
        throw new Error("OAuth callback is missing its authorization code");
      }

      const configuration = requireVendorOAuthConfiguration(
        options.environment,
        vendor,
      );
      const tokens = await VENDOR_ADAPTERS[vendor].exchangeCode({
        http,
        clientId: configuration.clientId,
        clientSecret: configuration.clientSecret,
        code: callback.code,
        redirectUri: callbackUrl(configuration.callbackBaseUrl, vendor),
        userId: state.userId,
        grantedScope: callback.scope,
        now: completedAt,
      });
      const cipher = requireVendorTokenCipher(options.environment);
      const connection: NewVendorConnectionRecord = {
        id: generateId(),
        userId: state.userId,
        vendor,
        externalUserId: tokens.externalUserId,
        accessTokenCiphertext: cipher.encrypt(tokens.accessToken),
        refreshTokenCiphertext: tokens.refreshToken
          ? cipher.encrypt(tokens.refreshToken)
          : null,
        accessTokenExpiresAt: tokens.accessTokenExpiresAt,
        scopes: tokens.scopes,
      };
      await options.repository.upsertConnection(connection);

      return { vendor, connected: true };
    },

    async getAccessToken(userId, vendor) {
      const connection = await options.repository.findConnection(
        userId,
        vendor,
      );
      if (!connection) {
        throw new Error(`${vendor} is not connected for this user`);
      }

      const cipher = requireVendorTokenCipher(options.environment);
      const currentAccessToken = cipher.decrypt(
        connection.accessTokenCiphertext,
      );
      const checkedAt = now();
      if (
        connection.accessTokenExpiresAt === null ||
        connection.accessTokenExpiresAt.getTime() >
          checkedAt.getTime() + 60_000
      ) {
        return currentAccessToken;
      }
      if (!connection.refreshTokenCiphertext) {
        throw new Error(`${vendor} must be reconnected; no refresh token exists`);
      }

      const configuration = requireVendorOAuthConfiguration(
        options.environment,
        vendor,
      );
      const refreshed = await VENDOR_ADAPTERS[vendor].refreshTokens({
        http,
        clientId: configuration.clientId,
        clientSecret: configuration.clientSecret,
        refreshToken: cipher.decrypt(connection.refreshTokenCiphertext),
        now: checkedAt,
      });
      const encryptedTokens: NewVendorTokenRecord = {
        accessTokenCiphertext: cipher.encrypt(refreshed.accessToken),
        refreshTokenCiphertext: cipher.encrypt(refreshed.refreshToken),
        accessTokenExpiresAt: refreshed.accessTokenExpiresAt,
      };
      await options.repository.updateConnectionTokens(
        connection.id,
        encryptedTokens,
      );

      return refreshed.accessToken;
    },

    async disconnect(userId, vendor) {
      const connection = await options.repository.findConnection(
        userId,
        vendor,
      );
      if (!connection) {
        throw new Error(`${vendor} is not connected for this user`);
      }

      const configuration = requireVendorOAuthConfiguration(
        options.environment,
        vendor,
      );
      const cipher = requireVendorTokenCipher(options.environment);
      await VENDOR_ADAPTERS[vendor].revokeAccess({
        http,
        clientId: configuration.clientId,
        clientSecret: configuration.clientSecret,
        accessToken: cipher.decrypt(connection.accessTokenCiphertext),
        refreshToken: connection.refreshTokenCiphertext
          ? cipher.decrypt(connection.refreshTokenCiphertext)
          : null,
        externalUserId: connection.externalUserId,
      });
      await options.repository.deleteConnection(connection.id);

      return { vendor, connected: false };
    },
  };
}
