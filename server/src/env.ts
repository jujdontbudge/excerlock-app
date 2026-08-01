import "dotenv/config";
import { z } from "zod";

const DEFAULT_POSTHOG_HOST = "https://us.i.posthog.com";
const DEFAULT_POSTHOG_API_HOST = "https://us.posthog.com";

function blankToUndefined(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

const optionalString = z.preprocess(blankToUndefined, z.string().optional());

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development")
    .catch("development"),
  HOST: z.preprocess(blankToUndefined, z.string().default("0.0.0.0")),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000).catch(3000),
  DATABASE_URL: optionalString,
  SENTRY_DSN: optionalString,
  CLERK_SECRET_KEY: optionalString,
  ADAPTY_SECRET_KEY: optionalString,
  POSTHOG_API_KEY: optionalString,
  POSTHOG_PERSONAL_API_KEY: optionalString,
  POSTHOG_PROJECT_ID: optionalString,
  VENDOR_OAUTH_CALLBACK_BASE_URL: optionalString,
  VENDOR_TOKEN_ENCRYPTION_KEY: optionalString,
  STRAVA_CLIENT_ID: optionalString,
  STRAVA_CLIENT_SECRET: optionalString,
  STRAVA_WEBHOOK_VERIFY_TOKEN: optionalString,
  STRAVA_WEBHOOK_SUBSCRIPTION_ID: optionalString,
  OURA_CLIENT_ID: optionalString,
  OURA_CLIENT_SECRET: optionalString,
  OURA_WEBHOOK_VERIFY_TOKEN: optionalString,
  WHOOP_CLIENT_ID: optionalString,
  WHOOP_CLIENT_SECRET: optionalString,
  POLAR_CLIENT_ID: optionalString,
  POLAR_CLIENT_SECRET: optionalString,
  POLAR_WEBHOOK_SIGNATURE_SECRET: optionalString,
  POSTHOG_HOST: z.preprocess(
    blankToUndefined,
    z.string().url().default(DEFAULT_POSTHOG_HOST).catch(DEFAULT_POSTHOG_HOST),
  ),
  POSTHOG_API_HOST: z.preprocess(
    blankToUndefined,
    z
      .string()
      .url()
      .default(DEFAULT_POSTHOG_API_HOST)
      .catch(DEFAULT_POSTHOG_API_HOST),
  ),
});

export interface Environment {
  nodeEnv: "development" | "test" | "production";
  host: string;
  port: number;
  databaseUrl: string | undefined;
  sentryDsn: string | undefined;
  clerkSecretKey: string | undefined;
  adaptySecretKey: string | undefined;
  posthogApiKey: string | undefined;
  posthogHost: string;
  posthogPersonalApiKey: string | undefined;
  posthogProjectId: string | undefined;
  posthogApiHost: string;
  vendorOAuthCallbackBaseUrl: string | undefined;
  vendorTokenEncryptionKey: string | undefined;
  stravaClientId: string | undefined;
  stravaClientSecret: string | undefined;
  stravaWebhookVerifyToken: string | undefined;
  stravaWebhookSubscriptionId: string | undefined;
  ouraClientId: string | undefined;
  ouraClientSecret: string | undefined;
  ouraWebhookVerifyToken: string | undefined;
  whoopClientId: string | undefined;
  whoopClientSecret: string | undefined;
  polarClientId: string | undefined;
  polarClientSecret: string | undefined;
  polarWebhookSignatureSecret: string | undefined;
}

export function parseEnv(
  input: Readonly<Record<string, string | undefined>> = process.env,
): Environment {
  const parsed = envSchema.parse(input);

  return {
    nodeEnv: parsed.NODE_ENV,
    host: parsed.HOST,
    port: parsed.PORT,
    databaseUrl: parsed.DATABASE_URL,
    sentryDsn: parsed.SENTRY_DSN,
    clerkSecretKey: parsed.CLERK_SECRET_KEY,
    adaptySecretKey: parsed.ADAPTY_SECRET_KEY,
    posthogApiKey: parsed.POSTHOG_API_KEY,
    posthogHost: parsed.POSTHOG_HOST,
    posthogPersonalApiKey: parsed.POSTHOG_PERSONAL_API_KEY,
    posthogProjectId: parsed.POSTHOG_PROJECT_ID,
    posthogApiHost: parsed.POSTHOG_API_HOST,
    vendorOAuthCallbackBaseUrl: parsed.VENDOR_OAUTH_CALLBACK_BASE_URL,
    vendorTokenEncryptionKey: parsed.VENDOR_TOKEN_ENCRYPTION_KEY,
    stravaClientId: parsed.STRAVA_CLIENT_ID,
    stravaClientSecret: parsed.STRAVA_CLIENT_SECRET,
    stravaWebhookVerifyToken: parsed.STRAVA_WEBHOOK_VERIFY_TOKEN,
    stravaWebhookSubscriptionId: parsed.STRAVA_WEBHOOK_SUBSCRIPTION_ID,
    ouraClientId: parsed.OURA_CLIENT_ID,
    ouraClientSecret: parsed.OURA_CLIENT_SECRET,
    ouraWebhookVerifyToken: parsed.OURA_WEBHOOK_VERIFY_TOKEN,
    whoopClientId: parsed.WHOOP_CLIENT_ID,
    whoopClientSecret: parsed.WHOOP_CLIENT_SECRET,
    polarClientId: parsed.POLAR_CLIENT_ID,
    polarClientSecret: parsed.POLAR_CLIENT_SECRET,
    polarWebhookSignatureSecret: parsed.POLAR_WEBHOOK_SIGNATURE_SECRET,
  };
}
