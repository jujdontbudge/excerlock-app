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

    // Registered, and ahead of the ScreenTime extension validator — NOT last.
    // #80 and #82 both landed a plugin asserting `.at(-1)`, and only one can
    // hold that slot. `withScreenTimeExtensionValidation` earns it: it is a
    // validator, so it has to run after everything it validates. This plugin
    // only configures the Motion permission, where position is irrelevant, so
    // membership plus ordering is the honest assertion.
    const appConfig = readJson<AppConfig>(fromRoot("app", "app.json"));
    const plugins = appConfig.expo?.plugins ?? [];
    const motionIndex = plugins.indexOf("./modules/excerlock-motion/app.plugin.js");
    const validatorIndex = plugins.indexOf(
      "./plugins/withScreenTimeExtensionValidation",
    );
    expect(motionIndex).toBeGreaterThanOrEqual(0);
    expect(validatorIndex).toBeGreaterThan(motionIndex);
  });
});
