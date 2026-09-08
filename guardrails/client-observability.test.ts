import { describe, expect, it } from "vitest";

import { fromRoot, readJson, readUtf8 } from "./repo-files";

describe("client observability boot", () => {
  it("initializes Sentry first and preserves native plugin ordering", () => {
    const packageJson = readJson<{ main: string }>(
      fromRoot("app-next", "package.json"),
    );
    // The router entry is required *by* index.ts, so Sentry is installed before any app module
    // evaluates — the errors no boundary can catch are the ones worth reporting most.
    expect(packageJson.main).toBe("index.ts");

    const entry = readUtf8(fromRoot("app-next", "index.ts"));
    expect(entry.startsWith("import * as Sentry from '@sentry/react-native';")).toBe(
      true,
    );
    expect(entry.indexOf("Sentry.init(")).toBeGreaterThan(0);
    expect(entry.indexOf("require('expo-router/entry')")).toBeGreaterThan(
      entry.indexOf("Sentry.init("),
    );

    const appJson = readJson<{
      expo: { plugins: Array<string | [string, Record<string, unknown>]> };
    }>(fromRoot("app-next", "app.json"));

    // Slot 0 belongs to withNoPush, which applies last under Expo's LIFO order and strips any
    // push entitlement a plugin added (see plugin-order.test.ts). The Sentry plugin sits where the
    // shipping app/app.json puts it, after the native modules and before the Screen Time validator.
    expect(appJson.expo.plugins).toContainEqual([
      "@sentry/react-native",
      { organization: "edge-ix", project: "excerlock-mobile" },
    ]);
    const names = appJson.expo.plugins.map((plugin) =>
      Array.isArray(plugin) ? plugin[0] : plugin,
    );
    expect(names[0]).toBe("./plugins/withNoPush");
    expect(names.indexOf("@sentry/react-native")).toBeLessThan(
      names.indexOf("./plugins/withScreenTimeExtensionValidation"),
    );

    const metroConfig = readUtf8(fromRoot("app-next", "metro.config.js"));
    expect(metroConfig).toContain("getSentryExpoConfig");
    expect(metroConfig).toContain("includeWebReplay: false");
  });

  it("keeps the vendor keys out of the repository", () => {
    // app.config.ts reads them from ~/.excerlock/env or the EAS environment at build time.
    const appConfig = readUtf8(fromRoot("app-next", "app.config.ts"));
    expect(appConfig).toContain("EXPO_PUBLIC_POSTHOG_KEY");
    expect(appConfig).toContain("SENTRY_DSN_MOBILE");
    expect(appConfig).not.toMatch(/phc_[A-Za-z0-9]{16}/);
    expect(appConfig).not.toMatch(/https:\/\/[0-9a-f]{16,}@/);

    const appJson = readUtf8(fromRoot("app-next", "app.json"));
    expect(appJson).not.toMatch(/phc_[A-Za-z0-9]{16}/);
    expect(appJson).not.toMatch(/https:\/\/[0-9a-f]{16,}@/);
  });
});
