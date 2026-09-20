import "dotenv/config";
import { z } from "zod";

const DEFAULT_POSTHOG_HOST = "https://us.i.posthog.com";
const DEFAULT_POSTHOG_API_HOST = "https://us.posthog.com";
const DEFAULT_SUPPORT_NOTIFY_EMAIL = "johansardar77@gmail.com";
const DEFAULT_SUPPORT_FROM_EMAIL = "ExcerLock <onboarding@resend.dev>";
const DEFAULT_DELETION_WORKER_INTERVAL_MS = 30_000;
const DEFAULT_DELETION_WORKER_BATCH_SIZE = 10;
const DEFAULT_DELETION_GATEWAY_TIMEOUT_MS = 10_000;

function blankToUndefined(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

const optionalString = z.preprocess(blankToUndefined, z.string().optional());
const optionalUrl = z.preprocess(
  blankToUndefined,
  z.string().url().optional(),
);
const acceptedStoreEnvironments = z.preprocess(
  blankToUndefined,
  z.string().default("production,sandbox").transform((value, context) => {
    const values = [...new Set(value.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean))];
    if (values.length === 0 || values.some((item) => item !== "production" && item !== "sandbox")) {
      context.addIssue({ code: "custom", message: "accepted store environments must contain only production,sandbox" });
      return z.NEVER;
    }
    return values as ("production" | "sandbox")[];
  }),
);

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development")
    .catch("development"),
  HOST: optionalString,
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000).catch(3000),
  DATABASE_URL: optionalString,
  SENTRY_DSN: optionalString,
  CLERK_SECRET_KEY: optionalString,
  CLERK_ISSUER: optionalUrl,
  SUPABASE_URL: optionalUrl,
  SUPABASE_JWKS_URL: optionalUrl,
  SUPABASE_JWT_SECRET: optionalString,
  SUPABASE_JWT_ALGORITHMS: optionalString,
  SUPABASE_SERVICE_ROLE_KEY: optionalString,
  ADAPTY_SECRET_KEY: optionalString,
  ADAPTY_WEBHOOK_SECRET: optionalString,
  ADAPTY_WEBHOOK_ACCEPTED_STORE_ENVIRONMENTS: acceptedStoreEnvironments,
  SUBSCRIPTION_AUTHORIZATION_STORE_ENVIRONMENT: z.literal("production").default("production"),
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
  RESEND_API_KEY: optionalString,
  SUPPORT_NOTIFY_EMAIL: z.preprocess(
    blankToUndefined,
    z.string().default(DEFAULT_SUPPORT_NOTIFY_EMAIL),
  ),
  SUPPORT_FROM_EMAIL: z.preprocess(
    blankToUndefined,
    z.string().default(DEFAULT_SUPPORT_FROM_EMAIL),
  ),
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
  DELETION_WORKER_ENABLED: z.preprocess(
    blankToUndefined,
    z.string().optional(),
  ),
  DELETION_WORKER_INTERVAL_MS: z.coerce
    .number()
    .int()
    .min(1_000)
    .max(600_000)
    .default(DEFAULT_DELETION_WORKER_INTERVAL_MS)
    .catch(DEFAULT_DELETION_WORKER_INTERVAL_MS),
  DELETION_WORKER_BATCH_SIZE: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(DEFAULT_DELETION_WORKER_BATCH_SIZE)
    .catch(DEFAULT_DELETION_WORKER_BATCH_SIZE),
  DELETION_GATEWAY_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(1_000)
    .max(60_000)
    .default(DEFAULT_DELETION_GATEWAY_TIMEOUT_MS)
    .catch(DEFAULT_DELETION_GATEWAY_TIMEOUT_MS),
});

function requireProductionHttps(
  parsed: z.infer<typeof envSchema>,
): void {
  if (parsed.NODE_ENV !== "production") {
    return;
  }

  const settings: readonly [
    name: string,
    value: string | undefined,
    allowUsername: boolean,
  ][] = [
    ["SUPABASE_URL", parsed.SUPABASE_URL, false],
    ["SUPABASE_JWKS_URL", parsed.SUPABASE_JWKS_URL, false],
    ["CLERK_ISSUER", parsed.CLERK_ISSUER, false],
    [
      "VENDOR_OAUTH_CALLBACK_BASE_URL",
      parsed.VENDOR_OAUTH_CALLBACK_BASE_URL,
      false,
    ],
    ["POSTHOG_HOST", parsed.POSTHOG_HOST, false],
    ["POSTHOG_API_HOST", parsed.POSTHOG_API_HOST, false],
    ["SENTRY_DSN", parsed.SENTRY_DSN, true],
  ];

  for (const [name, value, allowUsername] of settings) {
    if (!value) {
      continue;
    }
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new Error(`${name} must be a valid HTTPS URL`);
    }
    if (
      url.protocol !== "https:" ||
      Boolean(url.password) ||
      (!allowUsername && Boolean(url.username))
    ) {
      throw new Error(`${name} must use HTTPS without private credentials`);
    }
  }
}

export interface Environment {
  nodeEnv: "development" | "test" | "production";
  host: string;
  port: number;
  databaseUrl: string | undefined;
  sentryDsn: string | undefined;
  clerkSecretKey: string | undefined;
  clerkIssuer: string | undefined;
  supabaseUrl: string | undefined;
  supabaseJwksUrl: string | undefined;
  supabaseJwtSecret: string | undefined;
  supabaseJwtAlgorithms: string | undefined;
  supabaseServiceRoleKey: string | undefined;
  adaptySecretKey: string | undefined;
  adaptyWebhookAuth: string | undefined;
  adaptyWebhookAcceptedStoreEnvironments: readonly ("production" | "sandbox")[];
  subscriptionAuthorizationStoreEnvironment: "production";
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
  resendApiKey: string | undefined;
  supportNotifyEmail: string;
  supportFromEmail: string;
  deletionWorkerEnabled: boolean;
  deletionWorkerIntervalMs: number;
  deletionWorkerBatchSize: number;
  deletionGatewayTimeoutMs: number;
}

export function parseEnv(
  input: Readonly<Record<string, string | undefined>> = process.env,
): Environment {
  const parsed = envSchema.parse(input);
  requireProductionHttps(parsed);

  return {
    nodeEnv: parsed.NODE_ENV,
    host:
      parsed.HOST ??
      (parsed.NODE_ENV === "production" ? "127.0.0.1" : "0.0.0.0"),
    port: parsed.PORT,
    databaseUrl: parsed.DATABASE_URL,
    sentryDsn: parsed.SENTRY_DSN,
    clerkSecretKey: parsed.CLERK_SECRET_KEY,
    clerkIssuer: parsed.CLERK_ISSUER,
    supabaseUrl: parsed.SUPABASE_URL,
    supabaseJwksUrl: parsed.SUPABASE_JWKS_URL,
    supabaseJwtSecret: parsed.SUPABASE_JWT_SECRET,
    supabaseJwtAlgorithms: parsed.SUPABASE_JWT_ALGORITHMS,
    supabaseServiceRoleKey: parsed.SUPABASE_SERVICE_ROLE_KEY,
    adaptySecretKey: parsed.ADAPTY_SECRET_KEY,
    adaptyWebhookAuth: parsed.ADAPTY_WEBHOOK_SECRET,
    adaptyWebhookAcceptedStoreEnvironments: parsed.ADAPTY_WEBHOOK_ACCEPTED_STORE_ENVIRONMENTS,
    subscriptionAuthorizationStoreEnvironment: parsed.SUBSCRIPTION_AUTHORIZATION_STORE_ENVIRONMENT,
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
    resendApiKey: parsed.RESEND_API_KEY,
    supportNotifyEmail: parsed.SUPPORT_NOTIFY_EMAIL,
    supportFromEmail: parsed.SUPPORT_FROM_EMAIL,
    deletionWorkerEnabled: parsed.DELETION_WORKER_ENABLED !== "false",
    deletionWorkerIntervalMs: parsed.DELETION_WORKER_INTERVAL_MS,
    deletionWorkerBatchSize: parsed.DELETION_WORKER_BATCH_SIZE,
    deletionGatewayTimeoutMs: parsed.DELETION_GATEWAY_TIMEOUT_MS,
  };
}
