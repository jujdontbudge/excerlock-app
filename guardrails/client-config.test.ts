import { describe, expect, it } from "vitest";

import { fromRoot, readUtf8, repoRelative, walkFiles } from "./repo-files";

/**
 * Every value the real runtime needs comes from one place: `app.config.ts` reads the environment
 * (EAS supplies it; `~/.excerlock/env` is the local fallback) and publishes it into `extra`. A name
 * that only exists in a module's own `process.env` read is a value nobody can set in EAS, so this
 * guardrail is the list Johan configures against.
 */
const REQUIRED_NAMES = [
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "EXPO_PUBLIC_API_URL",
  "EXPO_PUBLIC_ADAPTY_KEY",
  "EXPO_PUBLIC_POSTHOG_KEY",
  "POSTHOG_HOST",
  "SENTRY_DSN_MOBILE",
  "GOOGLE_OAUTH_WEB_CLIENT_ID",
  "GOOGLE_OAUTH_IOS_CLIENT_ID",
] as const;

describe("client configuration names", () => {
  it("reads every runtime value in app.config.ts", () => {
    const appConfig = readUtf8(fromRoot("app-next", "app.config.ts"));
    REQUIRED_NAMES.forEach((name) => {
      expect(appConfig, `${name} must be read by app.config.ts`).toContain(name);
    });
  });

  it("publishes the Supabase, API, Adapty and Google values into extra", () => {
    const appConfig = readUtf8(fromRoot("app-next", "app.config.ts"));
    ["supabaseUrl", "supabaseKey", "apiBaseUrl", "googleWebClientId", "googleIosClientId"].forEach(
      (key) => {
        expect(appConfig).toContain(`${key}:`);
      },
    );
    expect(appConfig).toContain("adaptyKey:");
  });

  it("has one name for the VPS base URL", () => {
    const offenders = walkFiles(
      fromRoot("app-next"),
      new Set([".ts", ".tsx", ".js", ".json", ".md"]),
    )
      .filter((path) => readUtf8(path).includes("EXPO_PUBLIC_API_BASE_URL"))
      .map(repoRelative);
    expect(
      offenders,
      "EXPO_PUBLIC_API_URL is the only name; EXPO_PUBLIC_API_BASE_URL was retired",
    ).toEqual([]);
  });
});
