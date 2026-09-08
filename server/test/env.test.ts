import { describe, expect, it } from "vitest";
import { parseEnv } from "../src/env.js";

describe("parseEnv", () => {
  it("uses safe defaults when no environment is configured", () => {
    expect(parseEnv({})).toEqual({
      nodeEnv: "development",
      host: "0.0.0.0",
      port: 3000,
      databaseUrl: undefined,
      sentryDsn: undefined,
      supabaseUrl: undefined,
      supabaseJwtJwksUrl: undefined,
      supabaseJwtSecret: undefined,
      supabaseServiceRoleKey: undefined,
      adaptySecretKey: undefined,
      adaptyWebhookAuth: undefined,
      posthogApiKey: undefined,
      posthogHost: "https://us.i.posthog.com",
      posthogPersonalApiKey: undefined,
      posthogProjectId: undefined,
      posthogApiHost: "https://us.posthog.com",
    });
  });

  it("parses typed values and treats blank keys as absent", () => {
    expect(
      parseEnv({
        NODE_ENV: "test",
        HOST: "127.0.0.1",
        PORT: "4312",
        DATABASE_URL: " postgres://db.example/excerlock ",
        SENTRY_DSN: "   ",
        SUPABASE_URL: " https://project.supabase.co ",
        SUPABASE_JWT_JWKS_URL: "   ",
        SUPABASE_SERVICE_ROLE_KEY: " service-role ",
        ADAPTY_SECRET_KEY: " adapty-secret ",
        ADAPTY_WEBHOOK_SECRET: " webhook-auth ",
        POSTHOG_API_KEY: "",
        POSTHOG_HOST: "https://eu.i.posthog.com",
        POSTHOG_PERSONAL_API_KEY: " posthog-personal-key ",
        POSTHOG_PROJECT_ID: " 12345 ",
        POSTHOG_API_HOST: "https://eu.posthog.com",
      }),
    ).toEqual({
      nodeEnv: "test",
      host: "127.0.0.1",
      port: 4312,
      databaseUrl: "postgres://db.example/excerlock",
      sentryDsn: undefined,
      supabaseUrl: "https://project.supabase.co",
      supabaseJwtJwksUrl: undefined,
      supabaseJwtSecret: undefined,
      supabaseServiceRoleKey: "service-role",
      adaptySecretKey: "adapty-secret",
      adaptyWebhookAuth: "webhook-auth",
      posthogApiKey: undefined,
      posthogHost: "https://eu.i.posthog.com",
      posthogPersonalApiKey: "posthog-personal-key",
      posthogProjectId: "12345",
      posthogApiHost: "https://eu.posthog.com",
    });
  });

  it("has no Clerk or vendor keys left to parse", () => {
    const parsed = parseEnv({
      CLERK_SECRET_KEY: "sk_test_example",
      STRAVA_CLIENT_ID: "1234",
      VENDOR_TOKEN_ENCRYPTION_KEY: "key",
    }) as unknown as Record<string, unknown>;

    expect(
      Object.keys(parsed).filter((key) =>
        /clerk|strava|oura|whoop|polar|vendor/i.test(key),
      ),
    ).toEqual([]);
  });

  it.each(["0", "65536", "not-a-number"])(
    "falls back to port 3000 for invalid PORT=%s",
    (port) => {
      expect(parseEnv({ PORT: port }).port).toBe(3000);
    },
  );

  it("falls back for an invalid environment name and PostHog host", () => {
    const parsed = parseEnv({
      NODE_ENV: "preview",
      POSTHOG_HOST: "not a URL",
    });

    expect(parsed.nodeEnv).toBe("development");
    expect(parsed.posthogHost).toBe("https://us.i.posthog.com");
  });
});
