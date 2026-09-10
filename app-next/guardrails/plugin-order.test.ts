import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const appNextRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}
function pluginName(entry: string | [string, ...unknown[]]): string {
  return Array.isArray(entry) ? (entry[0] as string) : entry;
}

describe("T01 plugin-order guardrail (app-next)", () => {
  it("keeps the Screen Time validator first-listed (runs last, LIFO)", () => {
    const config = readJson(join(appNextRoot, "app.json"));
    const plugins = config.expo?.plugins ?? [];
    expect(pluginName(plugins[0])).toBe(
      "./plugins/withScreenTimeExtensionValidation",
    );
    // Validator must run after everything it validates: it holds the
    // first-listed slot; no other plugin may take it.
    const validatorIndex = plugins.findIndex(
      (p: any) => pluginName(p) === "./plugins/withScreenTimeExtensionValidation",
    );
    expect(validatorIndex).toBe(0);
  });

  it("keeps withNoPush absent (B50 keeps push)", () => {
    const config = readJson(join(appNextRoot, "app.json"));
    const plugins = config.expo?.plugins ?? [];
    const names = plugins.map(pluginName);
    expect(names).not.toContain("./plugins/withNoPush");
    // Native source must not contain the file either (deleted, not just unlisted).
    expect(() => readFileSync(join(appNextRoot, "plugins", "withNoPush.js"))).toThrow();
  });

  it("keeps vendor HealthKit immediately before the bootstrap", () => {
    const config = readJson(join(appNextRoot, "app.json"));
    const plugins = config.expo?.plugins ?? [];
    const names = plugins.map(pluginName);
    const vendor = names.indexOf("@kingstinct/react-native-healthkit");
    const bootstrap = names.indexOf("./plugins/withHealthKitBackgroundBootstrap");
    expect(vendor).toBeGreaterThanOrEqual(0);
    expect(bootstrap).toBe(vendor + 1);
  });

  it("mirrors app.json plugin order in config/native.ts", () => {
    const config = readJson(join(appNextRoot, "app.json"));
    const nativeSource = readFileSync(join(appNextRoot, "config", "native.ts"), "utf8");
    for (const name of [
      "./plugins/withScreenTimeExtensionValidation",
      "./plugins/withMainAppEntitlements",
      "./plugins/withPrivacyManifest",
      "./plugins/withHealthKitBackgroundBootstrap",
      "react-native-device-activity",
      "./modules/excerlock-motion/app.plugin",
      "./modules/excerlock-gait-vision/app.plugin",
      "expo-location",
      "expo-notifications",
      "expo-apple-authentication",
      "expo-secure-store",
      "expo-image-picker",
    ]) {
      expect(nativeSource).toContain(name);
    }
    expect(nativeSource).not.toMatch(/["']\.\/plugins\/withNoPush/);
    expect(nativeSource).not.toMatch(/["']react-native-device-activity["'].*withNoPush/);
  });
});
