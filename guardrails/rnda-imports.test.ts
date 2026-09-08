import { describe, expect, it } from "vitest";

import { fromRoot, readUtf8, repoRelative, walkFiles } from "./repo-files";

/**
 * The only two production files allowed to name the package.
 *
 * `deviceActivityApi.ts` is the operation surface: every Screen Time call and every app-group write,
 * including the shield content the extensions read, goes through it. The picker host is the single
 * exception the api cannot cover, because `FamilyActivityPicker` is a view component rather than a
 * function-shaped operation.
 */
const ALLOWED = [
  "app-next/src/engine/screentime/native/deviceActivityApi.ts",
  "app-next/src/engine/screentime/native/NativeScreenTimePickerHost.tsx",
];

/** Build configuration and the tests that mock the package by name are not app code. */
function isAppCode(path: string): boolean {
  return (
    !path.includes("/__tests__/") &&
    !path.endsWith("/plugins/withScreenTimeExtensionValidation.js") &&
    !/\/targets\/[^/]+\/expo-target\.config\.js$/.test(path)
  );
}

describe("react-native-device-activity import guardrail", () => {
  it("names the package in exactly the two files that own the native edge", () => {
    const importers = walkFiles(
      fromRoot("app-next"),
      new Set([".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx"]),
    )
      .filter((path) => readUtf8(path).includes("react-native-device-activity"))
      .filter(isAppCode)
      .map(repoRelative)
      .sort();

    expect(
      importers,
      "Route DeviceActivity through deviceActivityApi; the picker host is the one exception",
    ).toEqual([...ALLOWED].sort());
  });

  it("keeps the shield content publisher on that api rather than the package", () => {
    const publisher = readUtf8(
      fromRoot(
        "app-next",
        "src",
        "engine",
        "shield",
        "native",
        "nativeShieldContentPublisher.ts",
      ),
    );
    expect(publisher).toContain("deviceActivityApi.setSharedValue");
    expect(publisher).not.toMatch(/from ["'][^"']*react-native-device-activity["']/);
    expect(publisher).not.toMatch(/import\s*\{[^}]*userDefaultsSet/);
  });
});
