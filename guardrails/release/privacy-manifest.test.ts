import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { fromRoot, readJson, readUtf8, repoRelative, walkFiles } from "../repo-files";
import { fromReleaseApp, releaseAppDir } from "./release-app";

type PrivacyManifest = {
  ascAppId: string;
  tracking: boolean;
  dataTypes: Array<{
    category: string;
    type: string;
    collected: boolean;
    linkedToUser: boolean;
    usedForTracking: boolean;
    purposes: string[];
    evidence: string[];
    note?: string;
  }>;
  analyticsEvents: string[];
};

const codeExtensions = new Set([".ts", ".tsx"]);

describe("App Privacy manifest matches what the code collects", () => {
  const manifestPath = fromReleaseApp("release", "app-privacy.json");
  const manifest = readJson<PrivacyManifest>(manifestPath);

  it("never declares tracking (no ATT prompt, no cross-app advertising data)", () => {
    expect(manifest.tracking).toBe(false);
    for (const entry of manifest.dataTypes) {
      expect(entry.usedForTracking, `${entry.category}/${entry.type}`).toBe(false);
    }
  });

  it("uses only Apple's purposes and points every data type at code that exists", () => {
    const purposes = new Set([
      "App Functionality",
      "Analytics",
      "Product Personalization",
      "Developer's Advertising or Marketing",
      "Third-Party Advertising",
      "Other Purposes",
    ]);
    for (const entry of manifest.dataTypes) {
      const label = `${entry.category}/${entry.type}`;
      expect(entry.evidence.length, `${label} has no evidence`).toBeGreaterThan(0);
      for (const purpose of entry.purposes) {
        expect(purposes.has(purpose), `${label}: unknown purpose ${purpose}`).toBe(true);
      }
      for (const evidence of entry.evidence) {
        const [path] = evidence.split("#");
        expect(existsSync(fromRoot(path!)), `${label}: ${path} does not exist`).toBe(true);
      }
    }
  });

  it("lists every analytics event the release app emits", () => {
    const declared = new Set(manifest.analyticsEvents);
    const emitted = new Map<string, string>();
    for (const path of walkFiles(fromReleaseApp("src"), codeExtensions)) {
      if (/\/(__tests__|__previews__)\//.test(path)) continue;
      for (const match of readUtf8(path).matchAll(/analytics\.track\(\s*'([a-z_]+)'/g)) {
        emitted.set(match[1]!, repoRelative(path));
      }
    }

    const undeclared = [...emitted].filter(([name]) => !declared.has(name));
    expect(
      undeclared.map(([name, path]) => `${name} (${path})`),
      `add each event to ${releaseAppDir}/release/app-privacy.json and re-derive docs/release/app-privacy.md`,
    ).toEqual([]);
  });

  it("names the App Store Connect record the label is filed on", () => {
    expect(manifest.ascAppId).toBe("6787265352");
  });
});
