import { compileModsAsync, type ExpoConfig } from "expo/config-plugins";

const MOTION_PERMISSION_COPY =
  "ExcerLock uses Motion & Fitness data to verify that you're walking during Walk & Scroll sessions.";

describe("excerlock-motion config plugin", () => {
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
  });
});
