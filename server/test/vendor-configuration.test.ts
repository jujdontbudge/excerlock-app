import { describe, expect, it } from "vitest";
import { parseEnv } from "../src/env.js";
import {
  requireVendorOAuthConfiguration,
  requireVendorTokenCipher,
} from "../src/vendors/index.js";

describe("vendor configuration", () => {
  it("fails loudly on first use and names every missing OAuth setting", () => {
    const environment = parseEnv({});

    expect(() =>
      requireVendorOAuthConfiguration(environment, "strava"),
    ).toThrow(
      "Strava OAuth is not configured; missing STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, VENDOR_OAUTH_CALLBACK_BASE_URL",
    );
  });

  it("fails loudly when token encryption is first used without its key", () => {
    expect(() => requireVendorTokenCipher(parseEnv({}))).toThrow(
      "Vendor token encryption is not configured; missing VENDOR_TOKEN_ENCRYPTION_KEY",
    );
  });
});
