import { describe, expect, it } from "vitest";

import { fromRoot, readUtf8, repoRelative, walkFiles } from "./repo-files";

describe("flag-read guardrail", () => {
  it("keeps useFeatureFlag inside ExperimentVariantProvider", () => {
    const offenders = walkFiles(
      fromRoot("app"),
      new Set([".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx"]),
    )
      .filter(
        (path) =>
          repoRelative(path) !==
          "app/src/experiments/ExperimentVariantProvider.tsx",
      )
      .filter((path) => /\buseFeatureFlag\b/.test(readUtf8(path)))
      .map(repoRelative);

    expect(offenders, "Move all feature-flag reads into ExperimentVariantProvider.tsx").toEqual([]);
  });
});
