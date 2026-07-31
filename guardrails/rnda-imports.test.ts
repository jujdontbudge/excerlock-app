import { describe, expect, it } from "vitest";

import { fromRoot, readUtf8, repoRelative, walkFiles } from "./repo-files";

describe("react-native-device-activity import guardrail", () => {
  it("allows RNDA imports only in ScreenTime native edges", () => {
    const offenders = walkFiles(
      fromRoot("app"),
      new Set([".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx"]),
    )
      .filter((path) => readUtf8(path).includes("react-native-device-activity"))
      .filter(
        (path) =>
          !path.includes("/src/shield/") &&
          !path.includes("/src/screentime/native/") &&
          !path.includes("/src/signals/screentime/") &&
          !/\/targets\/[^/]+\/expo-target\.config\.js$/.test(path),
      )
      .map(repoRelative);

    expect(
      offenders,
      "Route RNDA through the ScreenTime native adapter or signal provider",
    ).toEqual([]);
  });
});
