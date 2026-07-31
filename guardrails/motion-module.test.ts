import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

import { fromRoot, readJson } from "./repo-files";

type AutolinkResolution = {
  modules: Array<{
    modules: Array<{ class: string }>;
    packageName: string;
    pods: Array<{ podName: string; podspecDir: string }>;
  }>;
};

type AppConfig = {
  expo?: { plugins?: Array<string | [string, ...unknown[]]> };
};

describe("excerlock-motion CNG wiring", () => {
  it("autolinks the Swift module and keeps its permission plugin last", () => {
    const result = spawnSync(
      fromRoot("node_modules", ".bin", "expo-modules-autolinking"),
      ["resolve", "--platform", "apple", "--json"],
      { cwd: fromRoot("app"), encoding: "utf8" },
    );

    expect(result.status, result.stderr).toBe(0);
    const resolution = JSON.parse(result.stdout) as AutolinkResolution;
    const motion = resolution.modules.find(
      ({ packageName }) => packageName === "excerlock-motion",
    );
    expect(motion).toBeDefined();
    expect(motion?.modules.map(({ class: className }) => className) ?? []).toContain(
      "ExcerlockMotionModule",
    );
    expect(motion?.pods.map(({ podName }) => podName) ?? []).toContain(
      "ExcerlockMotion",
    );

    const appConfig = readJson<AppConfig>(fromRoot("app", "app.json"));
    expect(appConfig.expo?.plugins?.at(-1)).toBe(
      "./modules/excerlock-motion/app.plugin.js",
    );
  });
});
