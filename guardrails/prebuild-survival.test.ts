import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { fromRoot, readJson, readUtf8, walkFiles } from "./repo-files";

type AppConfig = {
  expo?: {
    ios?: { bundleIdentifier?: string };
  };
};

type PackageJson = {
  dependencies?: Record<string, string>;
};

const extensionTargetPatterns = {
  "app-intents": /App.?Intents/i,
  "device-activity-monitor": /Device.?Activity.?Monitor/i,
  "shield-action": /Shield.?Action/i,
  "shield-configuration": /Shield.?Configuration/i,
} as const;

describe("prebuild-survival guardrail", () => {
  it("keeps every configured native target in the generated Xcode project", () => {
    const appConfig = readJson<AppConfig>(fromRoot("app", "app.json"));
    expect(appConfig.expo?.ios?.bundleIdentifier).toBe("com.excerlock.app");

    const packageJson = readJson<PackageJson>(fromRoot("app", "package.json"));
    const dependencies = packageJson.dependencies ?? {};
    const expectsRndaTargets = "react-native-device-activity" in dependencies;
    const expectsAppIntents =
      "@bacons/apple-targets" in dependencies ||
      walkFiles(fromRoot("app", "targets", "app-intents")).some(
        (path) => !path.endsWith("README.md") && !path.endsWith(".gitkeep"),
      );

    const expectedExtensions = [
      ...(expectsRndaTargets
        ? ["device-activity-monitor", "shield-action", "shield-configuration"] as const
        : []),
      ...(expectsAppIntents ? ["app-intents"] as const : []),
    ];

    if (expectedExtensions.length === 0) {
      return;
    }

    const projectFiles = walkFiles(fromRoot("app", "ios"), new Set(["project.pbxproj"]));
    expect(
      projectFiles.length,
      "Native extensions are configured, but app/ios is absent; run a clean Expo prebuild before guardrails",
    ).toBeGreaterThan(0);
    const project = projectFiles.map(readUtf8).join("\n");
    const missingTargets = expectedExtensions.filter(
      (target) => !extensionTargetPatterns[target].test(project),
    );

    expect(missingTargets, "A clean Expo prebuild dropped configured extension targets").toEqual([]);

    for (const target of expectedExtensions) {
      const entitlementFiles = walkFiles(fromRoot("app", "ios"), new Set([".entitlements"]));
      expect(
        entitlementFiles.some((path) => extensionTargetPatterns[target].test(path)),
        `No generated entitlements file found for ${target}`,
      ).toBe(true);
    }
  });
});
