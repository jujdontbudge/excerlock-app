import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    env: {
      CLERK_SECRET_KEY: "",
      DATABASE_URL: "",
      POSTHOG_API_KEY: "",
      SENTRY_DSN: "",
    },
    include: ["test/**/*.test.ts"],
  },
});
