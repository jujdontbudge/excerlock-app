import { describe, expect, it } from "vitest";

import { fromRoot, readJson, readUtf8 } from "./repo-files";

describe("client observability boot", () => {
  it("initializes Sentry first and preserves native plugin ordering", () => {
    const packageJson = readJson<{ main: string }>(
      fromRoot("app", "package.json"),
    );
    expect(packageJson.main).toBe("index.ts");

    const entry = readUtf8(fromRoot("app", "index.ts"));
    expect(entry.startsWith('import * as Sentry from "@sentry/react-native";')).toBe(
      true,
    );
    expect(entry.indexOf("Sentry.init(")).toBeGreaterThan(0);
    expect(entry.indexOf('require("expo-router/entry")')).toBeGreaterThan(
      entry.indexOf("Sentry.init("),
    );

    const appJson = readJson<{
      expo: { plugins: Array<string | [string, Record<string, unknown>]> };
    }>(fromRoot("app", "app.json"));
    const pluginNames = appJson.expo.plugins.map((plugin) =>
      Array.isArray(plugin) ? plugin[0] : plugin,
    );
    const sentryIndex = pluginNames.indexOf("@sentry/react-native");
    const validationIndex = pluginNames.indexOf(
      "./plugins/withScreenTimeExtensionValidation",
    );

    expect(sentryIndex).toBeGreaterThanOrEqual(0);
    expect(sentryIndex).toBeLessThan(validationIndex);

    expect(appJson.expo.plugins[sentryIndex]).toEqual([
      "@sentry/react-native",
      { organization: "edge-ix", project: "excerlock-mobile" },
    ]);

    const metroConfig = readUtf8(fromRoot("app", "metro.config.js"));
    expect(metroConfig).toContain("getSentryExpoConfig");
    expect(metroConfig).toContain("includeWebReplay: false");
  });
});
