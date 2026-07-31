import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { fromRoot, readJson, readUtf8, repoRelative, walkFiles } from "./repo-files";

type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

describe("HealthKit AppDelegate guardrail", () => {
  it("requires setupBackgroundObservers after HealthKit is installed", () => {
    const packageJsonPath = fromRoot("app", "package.json");
    const packageJson = existsSync(packageJsonPath)
      ? readJson<PackageJson>(packageJsonPath)
      : {};
    const declaredDependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };
    const healthKitInstalled = "@kingstinct/react-native-healthkit" in declaredDependencies;
    const appDelegates = walkFiles(
      fromRoot("app", "ios"),
      new Set(["AppDelegate.swift", "AppDelegate.mm", "AppDelegate.m"]),
    );
    const configuredDelegates = appDelegates
      .filter((path) => {
        const contents = readUtf8(path);
        return (
          contents.includes("import ReactNativeHealthkit") &&
          contents.includes("setupBackgroundObservers()")
        );
      })
      .map(repoRelative);

    expect(
      healthKitInstalled && configuredDelegates.length === 0,
      "HealthKit is declared, but no generated AppDelegate imports ReactNativeHealthkit and calls setupBackgroundObservers(); run prebuild and verify the pinned plugin patch",
    ).toBe(false);
  });
});
