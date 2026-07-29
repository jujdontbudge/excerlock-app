import { describe, expect, it } from "vitest";

import { fromRoot, readUtf8, repoRelative, walkFiles } from "./repo-files";

describe("flag-read guardrail", () => {
  it("keeps useFeatureFlag inside ExperimentVariantProvider", () => {
    const offenders = walkFiles(
      fromRoot("app", "src"),
      new Set([".ts", ".tsx"]),
    )
      .filter((path) => !path.endsWith("ExperimentVariantProvider.tsx"))
      .filter((path) => /\buseFeatureFlag\b/.test(readUtf8(path)))
      .map(repoRelative);

    expect(offenders, "Move all feature-flag reads into ExperimentVariantProvider.tsx").toEqual([]);
  });
});
