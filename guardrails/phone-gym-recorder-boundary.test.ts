import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

import { fromRoot, readJson, readUtf8, walkFiles } from "./repo-files";

type RootPackage = { workspaces?: string[] };
type ExpoConfig = { expo?: { ios?: { bundleIdentifier?: string } } };
type ResearchConfig = { GYM_RECORDER_BUNDLE_ID: string; WALKING_RECORDER_BUNDLE_ID: string };

const recorderRoot = fromRoot("tools", "phone-gym-recorder");
// The recorder identity comes from the one research config owner that the
// build and the operator instructions also resolve it from.
const config = createRequire(import.meta.url)(
  fromRoot("app-next", "plugins", "linkedRecorderResearchConfig.js"),
) as ResearchConfig;
const recorderBundle = config.GYM_RECORDER_BUNDLE_ID;

describe("phone gym recorder isolation", () => {
  it("resolves its identity from the single research config owner, not a retyped string", () => {
    expect(recorderBundle).toBe("com.johansardar.excerlock.lab.gymrecorder");
    expect(config.WALKING_RECORDER_BUNDLE_ID).not.toBe(recorderBundle);
    // The gym recorder registers no URL scheme of any kind, so it has no
    // scheme constant to resolve: the identity owner carries the id alone.
    expect(config).not.toHaveProperty("GYM_RECORDER_SCHEME");
  });

  it("keeps the recorder outside every production Expo build and workspace root", () => {
    const rootPackage = readJson<RootPackage>(fromRoot("package.json"));
    expect(rootPackage.workspaces ?? []).not.toContain("tools/*");
    expect(rootPackage.workspaces ?? []).not.toContain("tools/phone-gym-recorder");

    const productionConfig = readJson<ExpoConfig>(fromRoot("app-next", "app.json"));
    expect(productionConfig.expo?.ios?.bundleIdentifier).toBe("com.johansardar.excerlock");
    expect(recorderRoot.startsWith(fromRoot("app-next"))).toBe(false);

    const productionFiles = walkFiles(
      fromRoot("app-next"),
      new Set([".ts", ".tsx", ".js", ".json", ".swift", ".m", ".mm"]),
    );
    const productionReferences = productionFiles.filter((path) =>
      readUtf8(path).includes("phone-gym-recorder"),
    );
    expect(productionReferences).toEqual([]);
  });

  it("uses a separate local-only native bundle with no OTA, app group, URL scheme, or entitlements", () => {
    const project = readUtf8(fromRoot("tools", "phone-gym-recorder", "project.yml"));
    expect(project).toContain(`PRODUCT_BUNDLE_IDENTIFIER: ${recorderBundle}`);
    expect(project).not.toContain("com.johansardar.excerlock\n");
    expect(project).not.toMatch(/expo-updates|EXUpdates|runtimeVersion|updates\.url/i);
    expect(project).not.toMatch(/CODE_SIGN_ENTITLEMENTS|application-groups|App Group/i);

    const infoPlist = readUtf8(fromRoot("tools", "phone-gym-recorder", "Support", "Info.plist"));
    expect(infoPlist).not.toMatch(/CFBundleURLTypes|CFBundleURLSchemes/i);
    expect(infoPlist).not.toMatch(/CODE_SIGN_ENTITLEMENTS|application-groups|App Group/i);

    // The one deliberate departure from the walking recorder: this harness must
    // keep delivering fixes while the phone is locked, because background
    // geofencing is the thing under test. It is an Info.plist key, not an
    // entitlement, and `location` must be the only background mode.
    const backgroundModes = infoPlist.match(/<key>UIBackgroundModes<\/key>\s*<array>([\s\S]*?)<\/array>/);
    const modes = [...(backgroundModes?.[1] ?? "").matchAll(/<string>([^<]+)<\/string>/g)].map(
      (match) => match[1],
    );
    expect(modes).toEqual(["location"]);
  });

  it("records locally and never reaches the network or a production identity", () => {
    const source = walkFiles(fromRoot("tools", "phone-gym-recorder", "Sources"), new Set([".swift"]))
      .map(readUtf8)
      .join("\n");
    expect(source).not.toMatch(/URLSession|NWConnection|uploadTask|dataTask/);
    // MapKit is allowed for the gym picker (tiles, search and reverse
    // geocoding go to Apple, never to an ExcerLock server); the archive itself
    // still never leaves the sandbox except by the person's share sheet.
    expect(source).not.toMatch(/MKMapView/);
    expect(source).not.toMatch(/identifierForVendor|advertisingIdentifier/);
    expect(source).not.toMatch(/import\s+Expo/);
    expect(source).not.toContain("com.johansardar.excerlock.lab.linkedtrace");
    expect(source).not.toMatch(/App\s?Group|group\.com\.johansardar/);
  });
});
