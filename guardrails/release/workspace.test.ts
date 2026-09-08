import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { fromRoot, readJson, readUtf8 } from "../repo-files";
import { cutoverComplete, releaseAppDir, type PackageJson } from "./release-app";

describe("Workspace points at the release app", () => {
  const rootPackage = readJson<PackageJson>(fromRoot("package.json"));

  it("lists the release app as a workspace", () => {
    expect(rootPackage.workspaces).toContain(releaseAppDir);
  });

  it("exposes the release guardrails as their own script", () => {
    expect(rootPackage.scripts?.["test:release-guardrails"]).toBe(
      "vitest run --config guardrails/vitest.config.ts guardrails/release",
    );
  });
});

describe.skipIf(!cutoverComplete)("After the cutover (docs/release/cutover-checklist.md, step 5 onward)", () => {
  const rootPackage = readJson<PackageJson>(fromRoot("package.json"));

  it("has removed the retired trees", () => {
    for (const retired of [
      ["app-next"],
      ["excer-ui-mock"],
      ["packages", "ledger"],
      ["packages", "condition-model"],
      ["e2e", "flows"],
      [".maestro"],
      ["scripts", "e2e-loop.sh"],
    ]) {
      expect(existsSync(fromRoot(...retired)), retired.join("/")).toBe(false);
    }
  });

  it("no longer references the retired workspaces or the Maestro contract tests", () => {
    expect(rootPackage.workspaces).not.toContain("app-next");
    expect(rootPackage.scripts?.["test:app-next"]).toBeUndefined();
    expect(rootPackage.scripts?.["test:e2e-contract"]).toBeUndefined();
    expect(rootPackage.scripts?.["test:unit"]).not.toContain("test:e2e-contract");
  });

  it("records the archive tag in ARCHITECTURE.md", () => {
    expect(readUtf8(fromRoot("ARCHITECTURE.md"))).toContain("old-app-final");
  });
});
