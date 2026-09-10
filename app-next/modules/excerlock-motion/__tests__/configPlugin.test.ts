import type { ExpoConfig } from "expo/config";
import { compileModsAsync } from "expo/config-plugins";

const MOTION_PERMISSION_COPY =
  "ExcerLock uses Motion & Fitness data to verify that you're walking during Walk & Scroll sessions.";

describe("excerlock-motion config plugin", () => {
  // compileModsAsync loads @expo/config-plugins base mods from disk; under a
  // fully parallel jest run that cold load alone can exceed the 5 s default.
  it("adds the honest Motion & Fitness usage description", async () => {
    const withExcerlockMotion = require("../app.plugin.js") as (
      config: ExpoConfig,
    ) => ExpoConfig;

    const config = await compileModsAsync(
      withExcerlockMotion({
        name: "ExcerLock",
        slug: "excerlock",
        ios: {},
      }),
      {
        introspect: true,
        platforms: ["ios"],
        projectRoot: process.cwd(),
      },
    );

    expect(config.ios?.infoPlist?.NSMotionUsageDescription).toBe(
      MOTION_PERMISSION_COPY,
    );
  }, 60_000);
});
