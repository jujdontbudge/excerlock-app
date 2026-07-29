import { describe, expect, it } from "vitest";

import { existsSync } from "node:fs";

import { fromRoot, readJson, readUtf8, repoRelative, walkFiles } from "./repo-files";

type AppConfig = {
  expo?: {
    plugins?: Array<string | [string, Record<string, unknown>]>;
  };
};

type PodfileProperties = {
  "ios.deploymentTarget"?: string;
};

describe("minimum-iOS guardrail", () => {
  it("keeps deployment target 17.4 in Expo and every target config", () => {
    const config = readJson<AppConfig>(fromRoot("app", "app.json"));
    const buildProperties = config.expo?.plugins?.find(
      (plugin): plugin is [string, Record<string, unknown>] =>
        Array.isArray(plugin) && plugin[0] === "expo-build-properties",
    );
    const deploymentTarget = buildProperties?.[1]?.ios;

    expect(deploymentTarget).toMatchObject({ deploymentTarget: "17.4" });

    const targetConfigs = [
      ...walkFiles(fromRoot("app", "targets"), new Set([".json", ".ts", ".js"])),
      ...walkFiles(fromRoot("app", "modules"), new Set([".podspec", ".json", ".xcconfig"])),
    ].filter((path) => !path.endsWith("README.md"));
    const offenders = targetConfigs
      .filter((path) => !readUtf8(path).includes("17.4"))
      .map(repoRelative);

    expect(offenders, "Every native target config must explicitly retain iOS 17.4").toEqual([]);

    const podfilePropertiesPath = fromRoot("app", "ios", "Podfile.properties.json");
    expect(
      existsSync(podfilePropertiesPath),
      "The min-iOS guardrail requires a clean Expo iOS prebuild",
    ).toBe(true);
    expect(readJson<PodfileProperties>(podfilePropertiesPath)["ios.deploymentTarget"]).toBe("17.4");

    const projectFiles = walkFiles(fromRoot("app", "ios"), new Set(["project.pbxproj"]));
    const appBuildSettings = projectFiles
      .flatMap((path) => [...readUtf8(path).matchAll(/buildSettings = \{([\s\S]*?)\n\s*\};/g)])
      .map((match) => match[1])
      .filter((settings): settings is string => settings !== undefined)
      .filter((settings) => settings.includes("PRODUCT_BUNDLE_IDENTIFIER = \"com.johansardar.excerlock\""));

    expect(appBuildSettings.length).toBeGreaterThan(0);
    expect(
      appBuildSettings.every((settings) => settings.includes("IPHONEOS_DEPLOYMENT_TARGET = 17.4")),
      "Every generated ExcerLock application build configuration must target iOS 17.4",
    ).toBe(true);
  });
});
