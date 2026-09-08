import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
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
