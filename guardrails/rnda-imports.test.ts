import { describe, expect, it } from "vitest";

import { fromRoot, readUtf8, repoRelative, walkFiles } from "./repo-files";

describe("react-native-device-activity import guardrail", () => {
  it("allows RNDA imports only in ScreenTime native edges", () => {
    const offenders = walkFiles(
      fromRoot("app-next"),
      new Set([".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx"]),
    )
      .filter((path) => readUtf8(path).includes("react-native-device-activity"))
      .filter(
        (path) =>
          // The shield transport reaches the app group through the ScreenTime api now; only its
          // tests, which mock the package by name, may still mention it.
          !(
            path.includes("/src/engine/shield/") &&
            path.includes("/__tests__/")
          ) &&
          !path.includes("/src/engine/screentime/native/") &&
          !path.endsWith("/plugins/withScreenTimeExtensionValidation.js") &&
          !/\/targets\/[^/]+\/expo-target\.config\.js$/.test(path),
      )
      .map(repoRelative);

    expect(
      offenders,
      "Route RNDA through the ScreenTime native adapter or signal provider",
    ).toEqual([]);
  });
});
