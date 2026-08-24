import type { ExpoConfig } from "expo/config";
import { compileModsAsync } from "expo/config-plugins";

const CAMERA_PERMISSION_COPY =
  "Allow ExcerLock to use the front camera to verify treadmill walking while the app is open.";

describe("excerlock-gait-vision config plugin", () => {
  it("adds a camera usage description scoped to foreground treadmill checks", async () => {
    const withExcerlockGaitVision = require("../app.plugin.js") as (
      config: ExpoConfig,
    ) => ExpoConfig;

    const config = await compileModsAsync(
      withExcerlockGaitVision({
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

    expect(config.ios?.infoPlist?.NSCameraUsageDescription).toBe(
      CAMERA_PERMISSION_COPY,
    );
  }, 60_000);
});
