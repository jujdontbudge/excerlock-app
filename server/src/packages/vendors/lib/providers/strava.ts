import { z } from "zod";
import type { VendorProviderAdapter } from "./types.js";
import {
  formBody,
  invalidResponse,
  requireSuccess,
} from "./types.js";

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  expires_at: z.number().int().positive(),
  athlete: z.object({
    id: z.union([z.string().min(1), z.number().int()]),
  }),
  scope: z.string().optional(),
});

const refreshResponseSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  expires_at: z.number().int().positive(),
});

export const stravaAdapter: VendorProviderAdapter = {
  async exchangeCode(input) {
    const response = await input.http.request({
      method: "POST",
      url: "https://www.strava.com/oauth/token",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: formBody({
        client_id: input.clientId,
        client_secret: input.clientSecret,
        code: input.code,
        grant_type: "authorization_code",
      }),
    });
    requireSuccess("Strava", "token exchange", response.status);
    const parsed = tokenResponseSchema.safeParse(response.body);
    if (!parsed.success) {
      throw invalidResponse("Strava", "token exchange");
    }

    return {
      accessToken: parsed.data.access_token,
      refreshToken: parsed.data.refresh_token,
      accessTokenExpiresAt: new Date(parsed.data.expires_at * 1_000),
      externalUserId: String(parsed.data.athlete.id),
      scopes: parsed.data.scope ?? input.grantedScope ?? "",
    };
  },

  async refreshTokens(input) {
    const response = await input.http.request({
      method: "POST",
      url: "https://www.strava.com/oauth/token",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: formBody({
        client_id: input.clientId,
        client_secret: input.clientSecret,
        grant_type: "refresh_token",
        refresh_token: input.refreshToken,
      }),
    });
    requireSuccess("Strava", "token refresh", response.status);
    const parsed = refreshResponseSchema.safeParse(response.body);
    if (!parsed.success) {
      throw invalidResponse("Strava", "token refresh");
    }

    return {
      accessToken: parsed.data.access_token,
      refreshToken: parsed.data.refresh_token,
      accessTokenExpiresAt: new Date(parsed.data.expires_at * 1_000),
    };
  },

  async revokeAccess(input) {
    const response = await input.http.request({
      method: "POST",
      url: "https://www.strava.com/oauth/revoke",
      headers: {
        authorization: `Basic ${Buffer.from(`${input.clientId}:${input.clientSecret}`).toString("base64")}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: formBody({
        token: input.accessToken,
        token_type_hint: "access_token",
      }),
    });
    requireSuccess("Strava", "token revocation", response.status);
  },
};
