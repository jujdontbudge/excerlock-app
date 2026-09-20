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
      clerkSecretKey: undefined,
      clerkIssuer: undefined,
      supabaseUrl: undefined,
      supabaseJwksUrl: undefined,
      supabaseJwtSecret: undefined,
      supabaseJwtAlgorithms: undefined,
      supabaseServiceRoleKey: undefined,
      adaptySecretKey: undefined,
      adaptyWebhookAuth: undefined,
      adaptyWebhookAcceptedStoreEnvironments: ["production", "sandbox"],
      subscriptionAuthorizationStoreEnvironment: "production",
      posthogApiKey: undefined,
      posthogHost: "https://us.i.posthog.com",
      posthogPersonalApiKey: undefined,
      posthogProjectId: undefined,
      posthogApiHost: "https://us.posthog.com",
      vendorOAuthCallbackBaseUrl: undefined,
      vendorTokenEncryptionKey: undefined,
      stravaClientId: undefined,
      stravaClientSecret: undefined,
      stravaWebhookVerifyToken: undefined,
      stravaWebhookSubscriptionId: undefined,
      ouraClientId: undefined,
      ouraClientSecret: undefined,
      ouraWebhookVerifyToken: undefined,
      whoopClientId: undefined,
      whoopClientSecret: undefined,
      polarClientId: undefined,
      polarClientSecret: undefined,
      polarWebhookSignatureSecret: undefined,
      resendApiKey: undefined,
      supportNotifyEmail: "johansardar77@gmail.com",
      supportFromEmail: "ExcerLock <onboarding@resend.dev>",
      deletionWorkerEnabled: true,
      deletionWorkerIntervalMs: 30_000,
      deletionWorkerBatchSize: 10,
      deletionGatewayTimeoutMs: 10_000,
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
        CLERK_SECRET_KEY: " sk_test_example ",
        CLERK_ISSUER: " https://example.clerk.accounts.dev ",
        SUPABASE_URL: " https://xyzcompany.supabase.co ",
        SUPABASE_JWKS_URL: " https://xyzcompany.supabase.co/auth/v1/.well-known/jwks.json ",
        SUPABASE_JWT_SECRET: " legacy-jwt-secret ",
        SUPABASE_JWT_ALGORITHMS: " RS256,ES256 ",
        SUPABASE_SERVICE_ROLE_KEY: " service-role-key ",
        ADAPTY_SECRET_KEY: " adapty-secret ",
        ADAPTY_WEBHOOK_SECRET: " webhook-auth ",
        POSTHOG_API_KEY: "",
        POSTHOG_HOST: "https://eu.i.posthog.com",
        POSTHOG_PERSONAL_API_KEY: " posthog-personal-key ",
        POSTHOG_PROJECT_ID: " 12345 ",
        POSTHOG_API_HOST: "https://eu.posthog.com",
        RESEND_API_KEY: "   ",
        SUPPORT_NOTIFY_EMAIL: " ops@example.com ",
        SUPPORT_FROM_EMAIL: "",
        DELETION_WORKER_ENABLED: "false",
        DELETION_WORKER_INTERVAL_MS: "15000",
        DELETION_WORKER_BATCH_SIZE: "5",
        DELETION_GATEWAY_TIMEOUT_MS: "8000",
      }),
    ).toEqual({
      nodeEnv: "test",
      host: "127.0.0.1",
      port: 4312,
      databaseUrl: "postgres://db.example/excerlock",
      sentryDsn: undefined,
      clerkSecretKey: "sk_test_example",
      clerkIssuer: "https://example.clerk.accounts.dev",
      supabaseUrl: "https://xyzcompany.supabase.co",
      supabaseJwksUrl:
        "https://xyzcompany.supabase.co/auth/v1/.well-known/jwks.json",
      supabaseJwtSecret: "legacy-jwt-secret",
      supabaseJwtAlgorithms: "RS256,ES256",
      supabaseServiceRoleKey: "service-role-key",
      adaptySecretKey: "adapty-secret",
      adaptyWebhookAuth: "webhook-auth",
      adaptyWebhookAcceptedStoreEnvironments: ["production", "sandbox"],
      subscriptionAuthorizationStoreEnvironment: "production",
      posthogApiKey: undefined,
      posthogHost: "https://eu.i.posthog.com",
      posthogPersonalApiKey: "posthog-personal-key",
      posthogProjectId: "12345",
      posthogApiHost: "https://eu.posthog.com",
      vendorOAuthCallbackBaseUrl: undefined,
      vendorTokenEncryptionKey: undefined,
      stravaClientId: undefined,
      stravaClientSecret: undefined,
      stravaWebhookVerifyToken: undefined,
      stravaWebhookSubscriptionId: undefined,
      ouraClientId: undefined,
      ouraClientSecret: undefined,
      ouraWebhookVerifyToken: undefined,
      whoopClientId: undefined,
      whoopClientSecret: undefined,
      polarClientId: undefined,
      polarClientSecret: undefined,
      polarWebhookSignatureSecret: undefined,
      resendApiKey: undefined,
      supportNotifyEmail: "ops@example.com",
      supportFromEmail: "ExcerLock <onboarding@resend.dev>",
      deletionWorkerEnabled: false,
      deletionWorkerIntervalMs: 15_000,
      deletionWorkerBatchSize: 5,
      deletionGatewayTimeoutMs: 8_000,
    });
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

  it("binds production to loopback when HOST is omitted", () => {
    expect(parseEnv({ NODE_ENV: "production" }).host).toBe("127.0.0.1");
  });

  it.each([
    "SUPABASE_URL",
    "SUPABASE_JWKS_URL",
    "CLERK_ISSUER",
    "VENDOR_OAUTH_CALLBACK_BASE_URL",
    "POSTHOG_HOST",
    "POSTHOG_API_HOST",
    "SENTRY_DSN",
  ])("rejects insecure production transport for %s", (key) => {
    expect(
      () =>
        parseEnv({
          NODE_ENV: "production",
          [key]: "http://example.test/service",
        }),
    ).toThrow(/HTTPS/);
  });

  it("accepts both webhook stores but fixes shared authorization to production", () => {
    const environment = parseEnv({
      ADAPTY_WEBHOOK_ACCEPTED_STORE_ENVIRONMENTS: "sandbox, production",
      SUBSCRIPTION_AUTHORIZATION_STORE_ENVIRONMENT: "production",
    });
    expect(environment.adaptyWebhookAcceptedStoreEnvironments).toEqual(["sandbox", "production"]);
    expect(environment.subscriptionAuthorizationStoreEnvironment).toBe("production");
    expect(() => parseEnv({ SUBSCRIPTION_AUTHORIZATION_STORE_ENVIRONMENT: "sandbox" })).toThrow();
    expect(() => parseEnv({ ADAPTY_WEBHOOK_ACCEPTED_STORE_ENVIRONMENTS: "staging" })).toThrow();
  });

  it("treats blank Supabase keys as absent and keeps worker enabled by default", () => {
    const parsed = parseEnv({
      SUPABASE_URL: "   ",
      SUPABASE_JWT_SECRET: "  ",
      DELETION_WORKER_ENABLED: "",
    });
    expect(parsed.supabaseUrl).toBeUndefined();
    expect(parsed.supabaseJwtSecret).toBeUndefined();
    expect(parsed.deletionWorkerEnabled).toBe(true);
  });
});
