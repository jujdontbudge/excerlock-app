import { z } from "zod";
import type { VendorProviderAdapter } from "./types.js";
import {
  formBody,
  invalidResponse,
  requireSuccess,
} from "./types.js";

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  x_user_id: z.union([z.string().min(1), z.number().int()]),
});

export const polarAdapter: VendorProviderAdapter = {
  async exchangeCode(input) {
    const tokenResponse = await input.http.request({
      method: "POST",
      url: "https://polarremote.com/v2/oauth2/token",
      headers: {
        accept: "application/json;charset=UTF-8",
        authorization: `Basic ${Buffer.from(`${input.clientId}:${input.clientSecret}`).toString("base64")}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: formBody({
        grant_type: "authorization_code",
        code: input.code,
        redirect_uri: input.redirectUri,
      }),
    });
    requireSuccess("Polar", "token exchange", tokenResponse.status);
    const tokens = tokenResponseSchema.safeParse(tokenResponse.body);
    if (!tokens.success) {
      throw invalidResponse("Polar", "token exchange");
    }

    const registrationResponse = await input.http.request({
      method: "POST",
      url: "https://www.polaraccesslink.com/v3/users",
      headers: {
        authorization: `Bearer ${tokens.data.access_token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ "member-id": input.userId }),
    });
    requireSuccess(
      "Polar",
      "user registration",
      registrationResponse.status,
      [409],
    );

    return {
      accessToken: tokens.data.access_token,
      refreshToken: null,
      accessTokenExpiresAt: null,
      externalUserId: String(tokens.data.x_user_id),
      scopes: "accesslink.read_all",
    };
  },

  async refreshTokens() {
    throw new Error("Polar access tokens do not use a refresh grant");
  },
};
