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
  scope: z.string().optional(),
});

const profileSchema = z.object({
  user_id: z.union([z.string().min(1), z.number().int()]),
});

export const whoopAdapter: VendorProviderAdapter = {
  async exchangeCode(input) {
    const tokenResponse = await input.http.request({
      method: "POST",
      url: "https://api.prod.whoop.com/oauth/oauth2/token",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: formBody({
        grant_type: "authorization_code",
        code: input.code,
        client_id: input.clientId,
        client_secret: input.clientSecret,
        redirect_uri: input.redirectUri,
      }),
    });
    requireSuccess("WHOOP", "token exchange", tokenResponse.status);
    const tokens = tokenResponseSchema.safeParse(tokenResponse.body);
    if (!tokens.success) {
      throw invalidResponse("WHOOP", "token exchange");
    }

    const identityResponse = await input.http.request({
      method: "GET",
      url: "https://api.prod.whoop.com/developer/v2/user/profile/basic",
      headers: { authorization: `Bearer ${tokens.data.access_token}` },
    });
    requireSuccess("WHOOP", "identity lookup", identityResponse.status);
    const identity = profileSchema.safeParse(identityResponse.body);
    if (!identity.success) {
      throw invalidResponse("WHOOP", "identity lookup");
    }

    return {
      accessToken: tokens.data.access_token,
      refreshToken: tokens.data.refresh_token,
      accessTokenExpiresAt: new Date(
        input.now.getTime() + tokens.data.expires_in * 1_000,
      ),
      externalUserId: String(identity.data.user_id),
      scopes: tokens.data.scope ?? input.grantedScope ?? "",
    };
  },
};
