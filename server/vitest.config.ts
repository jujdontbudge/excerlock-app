import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Several suites boot their own in-memory Postgres and run the whole
    // migration chain against it. Vitest starts those files in parallel, so
    // under load a single PGlite boot can take far longer than the 5s default
    // — a timeout there is a busy machine, not a failing assertion.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    env: {
      SUPABASE_URL: "",
      SUPABASE_JWT_JWKS_URL: "",
      SUPABASE_JWT_SECRET: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
      DATABASE_URL: "",
      POSTHOG_API_KEY: "",
      SENTRY_DSN: "",
    },
    include: ["test/**/*.test.ts"],
  },
});
