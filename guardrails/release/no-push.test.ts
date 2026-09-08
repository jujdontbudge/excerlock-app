import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { readUtf8, walkFiles } from "../repo-files";
import {
  fromReleaseApp,
  pluginName,
  readReleaseAppConfig,
  readReleasePackageJson,
} from "./release-app";

describe("No remote push entitlement in the release app", () => {
  const config = readReleaseAppConfig();
  const pkg = readReleasePackageJson();

  it("keeps withNoPush first so it runs last (Expo plugins apply in LIFO order)", () => {
    expect(pluginName(config.expo?.plugins?.[0])).toBe("./plugins/withNoPush");
    expect(existsSync(fromReleaseApp("plugins", "withNoPush.js"))).toBe(true);
    // The law is that the plugin deletes the entitlement, not how the file is quoted: app-next is
    // formatted with single quotes and the old app with double, and both spellings are correct.
    expect(readUtf8(fromReleaseApp("plugins", "withNoPush.js"))).toMatch(
      /delete modConfig\.modResults\[['"]aps-environment['"]\]/,
    );
  });

  it("declares no aps-environment or remote-notification background mode in app.json", () => {
    expect(config.expo?.ios?.entitlements?.["aps-environment"]).toBeUndefined();
    const backgroundModes = config.expo?.ios?.infoPlist?.UIBackgroundModes;
    expect(Array.isArray(backgroundModes) ? backgroundModes : []).not.toContain("remote-notification");
  });

  it("uses expo-notifications for local notifications only when it is installed", () => {
    // expo-notifications' iOS plugin writes aps-environment unless withNoPush strips it afterwards.
    if (!pkg.dependencies?.["expo-notifications"]) {
      return;
    }
    const plugins = (config.expo?.plugins ?? []).map(pluginName);
    expect(plugins[0]).toBe("./plugins/withNoPush");
  });

  it.skipIf(!existsSync(fromReleaseApp("ios")))("leaves no aps-environment in a generated native project", () => {
    for (const path of walkFiles(fromReleaseApp("ios"), new Set([".entitlements"]))) {
      expect(readUtf8(path), path).not.toContain("aps-environment");
    }
  });
});
