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
  SUPABASE_URL: optionalString,
  SUPABASE_JWT_JWKS_URL: optionalString,
  SUPABASE_JWT_SECRET: optionalString,
  SUPABASE_SERVICE_ROLE_KEY: optionalString,
  ADAPTY_SECRET_KEY: optionalString,
  ADAPTY_WEBHOOK_SECRET: optionalString,
  POSTHOG_API_KEY: optionalString,
  POSTHOG_PERSONAL_API_KEY: optionalString,
  POSTHOG_PROJECT_ID: optionalString,
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
  /** Project origin, e.g. `https://<ref>.supabase.co`. The issuer and the JWKS url derive from it. */
  supabaseUrl: string | undefined;
  /** Overrides the derived JWKS url; asymmetric (ES256/RS256) verification. */
  supabaseJwtJwksUrl: string | undefined;
  /** Legacy HS256 shared secret. Only consulted when no JWKS url is available. */
  supabaseJwtSecret: string | undefined;
  /** Admin API credential. Account deletion is its only use. */
  supabaseServiceRoleKey: string | undefined;
  adaptySecretKey: string | undefined;
  adaptyWebhookAuth: string | undefined;
  posthogApiKey: string | undefined;
  posthogHost: string;
  posthogPersonalApiKey: string | undefined;
  posthogProjectId: string | undefined;
  posthogApiHost: string;
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
    supabaseUrl: parsed.SUPABASE_URL,
    supabaseJwtJwksUrl: parsed.SUPABASE_JWT_JWKS_URL,
    supabaseJwtSecret: parsed.SUPABASE_JWT_SECRET,
    supabaseServiceRoleKey: parsed.SUPABASE_SERVICE_ROLE_KEY,
    adaptySecretKey: parsed.ADAPTY_SECRET_KEY,
    adaptyWebhookAuth: parsed.ADAPTY_WEBHOOK_SECRET,
    posthogApiKey: parsed.POSTHOG_API_KEY,
    posthogHost: parsed.POSTHOG_HOST,
    posthogPersonalApiKey: parsed.POSTHOG_PERSONAL_API_KEY,
    posthogProjectId: parsed.POSTHOG_PROJECT_ID,
    posthogApiHost: parsed.POSTHOG_API_HOST,
  };
}
