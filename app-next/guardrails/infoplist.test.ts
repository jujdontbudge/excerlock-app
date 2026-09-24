import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const appNextRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("T01 Info.plist guardrail (generated ios/, not config source)", () => {
  it("every §1 plist key is present once in the generated Info.plist", () => {
    const plist = join(appNextRoot, "ios", "ExcerLock", "Info.plist");
    if (!existsSync(plist)) {
      throw new Error(
        `Missing generated ${plist}. Run: npx expo prebuild --clean --no-install in app-next/.`,
      );
    }
    const text = readFileSync(plist, "utf8");
    const count = (key: string) =>
      (text.match(new RegExp(`<key>${key}<\\/key>`, "g")) ?? []).length;
    for (const key of [
      "NSMotionUsageDescription",
      "NSCameraUsageDescription",
      "NSLocationWhenInUseUsageDescription",
      "NSLocationAlwaysAndWhenInUseUsageDescription",
      "NSLocationAlwaysUsageDescription",
      "NSFaceIDUsageDescription",
      "NSPhotoLibraryUsageDescription",
      "UIBackgroundModes",
      "CFBundleLocalizations",
      "ITSAppUsesNonExemptEncryption",
    ]) {
      expect(count(key), `${key} must appear exactly once`).toBe(1);
    }
    // Export compliance is declared, not left to App Store Connect: the app
    // ships no non-exempt encryption, so the generated key must be false.
    expect(text).toMatch(
      /<key>ITSAppUsesNonExemptEncryption<\/key>\s*<false\/>/,
    );
    // No NSUserTrackingUsageDescription: v1 shows no ATT prompt
    // (NSPrivacyTracking=false). No CFBundleAlternateIcons: v1 bundles no
    // alternate icon assets, so any declaration would be phantom.
    expect(count("NSUserTrackingUsageDescription")).toBe(0);
    // No HealthKit (App Review Guideline 2.5.1): steps come from Core Motion, so
    // the app declares no Health purpose strings.
    expect(count("NSHealthShareUsageDescription")).toBe(0);
    expect(count("NSHealthUpdateUsageDescription")).toBe(0);
    expect(count("CFBundleAlternateIcons")).toBe(0);
    for (const mode of ["location", "fetch"]) {
      expect(text).toContain(`<string>${mode}</string>`);
    }
    expect(text).not.toContain("<string>processing</string>");
  });

  it("privacy manifest is non-empty with collected types + required-reason APIs", () => {
    const manifest = join(appNextRoot, "ios", "ExcerLock", "PrivacyInfo.xcprivacy");
    if (!existsSync(manifest)) {
      throw new Error(
        `Missing generated ${manifest}. Run prebuild (withPrivacyManifest copies privacy/PrivacyInfo.xcprivacy).`,
      );
    }
    const text = readFileSync(manifest, "utf8");
    expect(text).toContain("NSPrivacyCollectedDataTypes");
    // Non-empty: at least one collected type beyond the empty array.
    expect(text).toContain("NSPrivacyCollectedDataTypeProductInteraction");
    for (const api of [
      "NSPrivacyAccessedAPICategoryUserDefaults",
      "NSPrivacyAccessedAPICategoryFileTimestamp",
      "NSPrivacyAccessedAPICategorySystemBootTime",
      "NSPrivacyAccessedAPICategoryDiskSpace",
    ]) {
      expect(text).toContain(api);
    }
    // Shared app-group defaults (1C8F.1: UserDefaults(suiteName:) in every
    // extension) alongside own defaults (CA92.1).
    expect(text).toContain("1C8F.1");
    expect(text).toContain("CA92.1");
  });
});
