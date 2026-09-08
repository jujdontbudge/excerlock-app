import { describe, expect, it } from "vitest";

import { readUtf8, repoRelative, walkFiles } from "../repo-files";
import { fromReleaseApp } from "./release-app";

const codeExtensions = new Set([".ts", ".tsx", ".js", ".jsx"]);

function productionSources(): string[] {
  return [
    ...walkFiles(fromReleaseApp("src"), codeExtensions),
    ...walkFiles(fromReleaseApp("app"), codeExtensions),
  ].filter((path) => !/\/(__tests__|__previews__)\//.test(path));
}

describe("Developer surface is off in a release build (P2-T13 release hygiene)", () => {
  it("has exactly one dev gate, driven by __DEV__ or an explicit build-time flag", () => {
    const flag = readUtf8(fromReleaseApp("src", "runtime", "devFlag.ts"));

    expect(flag).toMatch(/export const devMenuEnabled = __DEV__ \|\| process\.env\.EXPO_PUBLIC_DEV_MENU === '1';/);
  });

  it("references the dev flag environment variable nowhere else", () => {
    const offenders = productionSources().filter(
      (path) => !path.endsWith("/runtime/devFlag.ts") && readUtf8(path).includes("EXPO_PUBLIC_DEV_MENU"),
    );

    expect(offenders.map(repoRelative)).toEqual([]);
  });

  it("registers the dev route only behind the dev gate", () => {
    const navigator = readUtf8(fromReleaseApp("src", "features", "launch", "RootNavigator.tsx"));

    expect(navigator).toMatch(/<Stack\.Protected guard=\{devMenuEnabled\}>\s*<Stack\.Screen name="dev" \/>\s*<\/Stack\.Protected>/);
  });

  it("gates the deep-link runtime mutation and the seven-tap footer on the same flag", () => {
    for (const relative of [
      ["src", "features", "home", "useDemoProgress.ts"],
      ["src", "features", "settings", "sections", "AboutSection.tsx"],
    ]) {
      const source = readUtf8(fromReleaseApp(...relative));
      expect(source, relative.join("/")).toMatch(/import \{ devMenuEnabled \} from/);
      expect(source, relative.join("/")).toMatch(/if \(!devMenuEnabled\) return/);
    }
  });

  it("renders no test-unlock buttons anywhere in production code", () => {
    const offenders = productionSources().filter((path) =>
      /Test (gym|treadmill) unlock/.test(readUtf8(path)),
    );

    expect(offenders.map(repoRelative)).toEqual([]);
  });

  it("ships no Maestro flows or scenario deep-link surface", () => {
    const offenders = productionSources().filter((path) => {
      const source = readUtf8(path);
      return source.includes("screen-e2e-error") || source.includes("EXPO_PUBLIC_E2E");
    });

    expect(offenders.map(repoRelative)).toEqual([]);
  });
});
