import { describe, expect, it } from "vitest";

import { fromRoot, readJson, readUtf8, repoRelative, walkFiles } from "./repo-files";

type AppConfig = {
  expo?: {
    plugins?: Array<string | [string, Record<string, unknown>]>;
  };
};

describe("minimum-iOS guardrail", () => {
  it("keeps deployment target 17.4 in Expo and every target config", () => {
    const config = readJson<AppConfig>(fromRoot("app", "app.json"));
    const buildProperties = config.expo?.plugins
      ?.filter(Array.isArray)
      .find(([name]) => name === "expo-build-properties");
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
  });
});
