import { describe, expect, it } from "vitest";

import { fromRoot, readJson } from "../repo-files";
import {
  APP_IDENTITY,
  oldAppPresent,
  readReleaseAppConfig,
  readReleasePackageJson,
  type ExpoAppConfig,
} from "./release-app";

describe("Release identity (decision A3)", () => {
  const config = readReleaseAppConfig();

  it("ships under the one app identity that never changed across the rebuild", () => {
    expect(config.expo?.name).toBe(APP_IDENTITY.name);
    expect(config.expo?.slug).toBe(APP_IDENTITY.slug);
    expect(config.expo?.owner).toBe(APP_IDENTITY.owner);
    expect(config.expo?.scheme).toBe(APP_IDENTITY.scheme);
    expect(config.expo?.ios?.bundleIdentifier).toBe(APP_IDENTITY.bundleIdentifier);
    expect(config.expo?.ios?.appleTeamId).toBe(APP_IDENTITY.appleTeamId);
    expect(config.expo?.extra?.eas?.projectId).toBe(APP_IDENTITY.easProjectId);
    expect(config.expo?.updates?.url).toBe(APP_IDENTITY.updatesUrl);
  });

  it("carries a release marketing version, never the old app's 0.0.0", () => {
    expect(config.expo?.version).toMatch(/^[1-9]\d*\.\d+\.\d+$/);
    expect(readReleasePackageJson().version).toBe(config.expo?.version);
  });

  it("leaves the build number to EAS remote versioning", () => {
    // docs/release/identity-and-versions.md: the build number lives on EAS
    // (`eas build:version:get`), so a local value would only mislead.
    expect(config.expo?.ios?.buildNumber).toBeUndefined();
  });

  it("keeps the app group fixed wherever a plugin declares one", () => {
    const declared = JSON.stringify(config.expo?.plugins ?? []).match(/group\.[a-z0-9.]+/g) ?? [];
    for (const group of declared) {
      expect(group).toBe(APP_IDENTITY.appGroup);
    }
  });

  it.skipIf(!oldAppPresent)("matches the identity of the old app it replaces", () => {
    const old = readJson<ExpoAppConfig>(fromRoot("app", "app.json"));

    expect(config.expo?.slug).toBe(old.expo?.slug);
    expect(config.expo?.scheme).toBe(old.expo?.scheme);
    expect(config.expo?.ios?.bundleIdentifier).toBe(old.expo?.ios?.bundleIdentifier);
    expect(config.expo?.ios?.appleTeamId).toBe(old.expo?.ios?.appleTeamId);
    expect(config.expo?.extra?.eas?.projectId).toBe(old.expo?.extra?.eas?.projectId);
    expect(config.expo?.updates?.url).toBe(old.expo?.updates?.url);
  });
});
