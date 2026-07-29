import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { fromRoot, readUtf8, repoRelative, walkFiles } from "./repo-files";

const ownerPattern = /owner\s*:\s*["'](client|server|adapty)["']/g;
const capturePattern = /\b(?:posthog\.)?capture\s*\(/;

describe("analytics single-emitter guardrail", () => {
  it("requires one declared owner and keeps raw capture calls on the owning side", () => {
    const analyticsRoot = fromRoot("packages", "analytics-events");
    const registryFiles = walkFiles(analyticsRoot, new Set([".ts", ".tsx"]));
    const owners = registryFiles.flatMap((path) =>
      [...readUtf8(path).matchAll(ownerPattern)].map((match) => match[1]),
    );
    const captureSites = [fromRoot("app", "src"), fromRoot("server", "src")]
      .flatMap((root) => walkFiles(root, new Set([".ts", ".tsx"])))
      .filter((path) => capturePattern.test(readUtf8(path)))
      .map(repoRelative);

    if (!existsSync(analyticsRoot)) {
      expect(captureSites, "Raw analytics capture calls require the typed analytics-events registry").toEqual([]);
      return;
    }

    expect(owners.length, "analytics-events must declare an owner for every event").toBeGreaterThan(0);
    expect(
      captureSites,
      "Application code must emit through the owned AnalyticsKit wrappers, not raw capture calls",
    ).toEqual([]);
  });
});
