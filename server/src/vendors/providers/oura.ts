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
  expires_in: z.number().int().positive(),
});

const personalInfoSchema = z.object({
  id: z.union([z.string().min(1), z.number().int()]),
});

export const ouraAdapter: VendorProviderAdapter = {
  async exchangeCode(input) {
    const tokenResponse = await input.http.request({
      method: "POST",
      url: "https://api.ouraring.com/oauth/token",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: formBody({
        grant_type: "authorization_code",
        code: input.code,
        redirect_uri: input.redirectUri,
        client_id: input.clientId,
        client_secret: input.clientSecret,
      }),
    });
    requireSuccess("Oura", "token exchange", tokenResponse.status);
    const tokens = tokenResponseSchema.safeParse(tokenResponse.body);
    if (!tokens.success) {
      throw invalidResponse("Oura", "token exchange");
    }

    const identityResponse = await input.http.request({
      method: "GET",
      url: "https://api.ouraring.com/v2/usercollection/personal_info",
      headers: { authorization: `Bearer ${tokens.data.access_token}` },
    });
    requireSuccess("Oura", "identity lookup", identityResponse.status);
    const identity = personalInfoSchema.safeParse(identityResponse.body);
    if (!identity.success) {
      throw invalidResponse("Oura", "identity lookup");
    }

    return {
      accessToken: tokens.data.access_token,
      refreshToken: tokens.data.refresh_token,
      accessTokenExpiresAt: new Date(
        input.now.getTime() + tokens.data.expires_in * 1_000,
      ),
      externalUserId: String(identity.data.id),
      scopes: input.grantedScope ?? "daily workout",
    };
  },

  async refreshTokens(input) {
    const response = await input.http.request({
      method: "POST",
      url: "https://api.ouraring.com/oauth/token",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: formBody({
        grant_type: "refresh_token",
        refresh_token: input.refreshToken,
        client_id: input.clientId,
        client_secret: input.clientSecret,
      }),
    });
    requireSuccess("Oura", "token refresh", response.status);
    const tokens = tokenResponseSchema.safeParse(response.body);
    if (!tokens.success) {
      throw invalidResponse("Oura", "token refresh");
    }

    return {
      accessToken: tokens.data.access_token,
      refreshToken: tokens.data.refresh_token,
      accessTokenExpiresAt: new Date(
        input.now.getTime() + tokens.data.expires_in * 1_000,
      ),
    };
  },
};
