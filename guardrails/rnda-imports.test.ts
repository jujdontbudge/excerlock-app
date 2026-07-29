import { describe, expect, it } from "vitest";

import { fromRoot, readUtf8, repoRelative, walkFiles } from "./repo-files";

describe("react-native-device-activity import guardrail", () => {
  it("allows RNDA imports only in shield and signals/screentime", () => {
    const offenders = walkFiles(
      fromRoot("app"),
      new Set([".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx"]),
    )
      .filter((path) => readUtf8(path).includes("react-native-device-activity"))
      .filter(
        (path) =>
          !path.includes("/src/shield/") &&
          !path.includes("/src/signals/screentime/"),
      )
      .map(repoRelative);

    expect(offenders, "Route RNDA reads through ScreenTimeProvider and writes through ShieldController").toEqual([]);
  });
});
