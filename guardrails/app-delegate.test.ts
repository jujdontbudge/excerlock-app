import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { fromRoot, readJson, readUtf8, repoRelative, walkFiles } from "./repo-files";

type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

describe("HealthKit AppDelegate guardrail", () => {
  it("requires setupBackgroundObservers after HealthKit is installed", () => {
    const packageJsonPath = fromRoot("app-next", "package.json");
    const packageJson = existsSync(packageJsonPath)
      ? readJson<PackageJson>(packageJsonPath)
      : {};
    const declaredDependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };
    const healthKitInstalled = "@kingstinct/react-native-healthkit" in declaredDependencies;
    const appDelegates = walkFiles(
      fromRoot("app-next", "ios"),
      new Set(["AppDelegate.swift", "AppDelegate.mm", "AppDelegate.m"]),
    );
    const configuredDelegates = appDelegates.filter((path) => {
      const contents = readUtf8(path);
      const usesDirectSwiftImport =
        contents.includes("import ReactNativeHealthkit") &&
        contents.includes("setupBackgroundObservers()");
      const usesNativeBridge =
        contents.includes(
          '@_silgen_name("ExcerLockSetupHealthKitBackgroundDelivery")',
        ) && contents.includes("    setupHealthKitBackgroundDelivery()");
      return usesDirectSwiftImport || usesNativeBridge;
    });
    const bridgeSources = walkFiles(
      fromRoot("app-next", "ios"),
      new Set(["HealthKitBackgroundBootstrap.mm"]),
    ).filter((path) =>
      readUtf8(path).includes(
        "[[BackgroundDeliveryManager shared] setupBackgroundObservers]",
      ),
    );
    const backgroundStartupConfigured =
      configuredDelegates.length > 0 &&
      (configuredDelegates.some((path) =>
        readUtf8(path).includes("import ReactNativeHealthkit"),
      ) || bridgeSources.length > 0);

    expect(
      healthKitInstalled && !backgroundStartupConfigured,
      `HealthKit is declared, but the generated native startup does not call setupBackgroundObservers(); checked ${appDelegates.map(repoRelative).join(", ")}`,
    ).toBe(false);
  });
});
