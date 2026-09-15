import { describe, expect, it } from "vitest";

import { fromRoot, readJson, readUtf8, walkFiles } from "./repo-files";

type RootPackage = { workspaces?: string[] };
type ExpoConfig = { expo?: { ios?: { bundleIdentifier?: string } } };

const recorderRoot = fromRoot("tools", "phone-walking-recorder");
const recorderBundle = "com.johansardar.excerlock.lab.walkingrecorder";

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

  it("registers only the lab-only link Trace Lab uses to start and re-open a test", () => {
    const info = readUtf8(fromRoot("tools", "phone-walking-recorder", "Support", "Info.plist"));
    expect(info).toContain("<string>excerlock-walkingrecorder</string>");
    expect(info).not.toMatch(/<string>(excerlock|excerlock-linked-trace)<\/string>/);
    expect(info).not.toContain("applinks");

    // Trace Lab starts the test; this app only returns through Trace Lab's own
    // scheme. Every URL builder in the recorder must stay lab-only.
    const controller = readUtf8(fromRoot("tools", "phone-walking-recorder", "Sources", "CaptureController.swift"));
    expect(controller).toContain('static let scheme = "excerlock-walkingrecorder"');
    expect(controller).toContain('static let traceLabScheme = "excerlock-linked-trace"');
    expect(controller).not.toMatch(/scheme = "excerlock"/);
    expect(controller).not.toMatch(/https?:\/\//);
  });
});
