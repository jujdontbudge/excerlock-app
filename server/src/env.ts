import "dotenv/config";
import { z } from "zod";

const DEFAULT_POSTHOG_HOST = "https://us.i.posthog.com";

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
  POSTHOG_API_KEY: optionalString,
  POSTHOG_HOST: z.preprocess(
    blankToUndefined,
    z.string().url().default(DEFAULT_POSTHOG_HOST).catch(DEFAULT_POSTHOG_HOST),
  ),
});

export interface Environment {
  nodeEnv: "development" | "test" | "production";
  host: string;
  port: number;
  databaseUrl: string | undefined;
  sentryDsn: string | undefined;
  clerkSecretKey: string | undefined;
  posthogApiKey: string | undefined;
  posthogHost: string;
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
    posthogApiKey: parsed.POSTHOG_API_KEY,
    posthogHost: parsed.POSTHOG_HOST,
  };
}
