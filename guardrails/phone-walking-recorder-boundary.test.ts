import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

import { fromRoot, readJson, readUtf8, walkFiles } from "./repo-files";

type RootPackage = { workspaces?: string[] };
type ExpoConfig = { expo?: { ios?: { bundleIdentifier?: string } } };
type ResearchConfig = { WALKING_RECORDER_BUNDLE_ID: string };

const recorderRoot = fromRoot("tools", "phone-walking-recorder");
// The recorder identity comes from the one research config owner that the
// build and the device proof also resolve it from.
const config = createRequire(import.meta.url)(
  fromRoot("app-next", "plugins", "linkedRecorderResearchConfig.js"),
) as ResearchConfig;
const recorderBundle = config.WALKING_RECORDER_BUNDLE_ID;

describe("phone walking recorder isolation", () => {
  it("keeps the recorder outside every production Expo build and workspace root", () => {
    const rootPackage = readJson<RootPackage>(fromRoot("package.json"));
    expect(rootPackage.workspaces ?? []).not.toContain("tools/*");
    expect(rootPackage.workspaces ?? []).not.toContain("tools/phone-walking-recorder");

    const productionConfig = readJson<ExpoConfig>(fromRoot("app-next", "app.json"));
    expect(productionConfig.expo?.ios?.bundleIdentifier).toBe("com.johansardar.excerlock");
    expect(recorderRoot.startsWith(fromRoot("app-next"))).toBe(false);

    const productionFiles = walkFiles(
      fromRoot("app-next"),
      new Set([".ts", ".tsx", ".js", ".json", ".swift", ".m", ".mm"]),
    );
    const productionReferences = productionFiles.filter((path) =>
      readUtf8(path).includes("phone-walking-recorder"),
    );
    expect(productionReferences).toEqual([]);
  });

  it("uses a separate local-only native bundle with no OTA, app group, or background keep-alive", () => {
    const project = readUtf8(fromRoot("tools", "phone-walking-recorder", "project.yml"));
    expect(project).toContain(`PRODUCT_BUNDLE_IDENTIFIER: ${recorderBundle}`);
    expect(project).not.toContain("com.johansardar.excerlock\n");
    expect(project).not.toMatch(/expo-updates|EXUpdates|runtimeVersion|updates\.url/i);
    expect(project).not.toMatch(/UIBackgroundModes|CODE_SIGN_ENTITLEMENTS|application-groups|App Group/i);

    const source = walkFiles(fromRoot("tools", "phone-walking-recorder", "Sources"), new Set([".swift"]))
      .map(readUtf8)
      .join("\n");
    expect(source).not.toMatch(/import\s+Expo|import\s+CoreLocation|CLLocationManager/);
    expect(source).not.toMatch(/URLSession|NWConnection|uploadTask|dataTask/);
    expect(source).not.toMatch(/identifierForVendor|advertisingIdentifier/);
  });
});
