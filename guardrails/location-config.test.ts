import { describe, expect, it } from "vitest";

import { fromRoot, readJson, readUtf8 } from "./repo-files";

type AppConfig = {
  expo?: {
    plugins?: Array<string | [string, Record<string, unknown>]>;
  };
};

type PackageJson = {
  dependencies?: Record<string, string>;
};

describe("location native-configuration guardrail", () => {
  it("enables background location with explicit foreground and Always permission copy", () => {
    const packageJson = readJson<PackageJson>(
      fromRoot("app-next", "package.json"),
    );
    expect(packageJson.dependencies).toMatchObject({
      "expo-location": "~57.0.7",
      "expo-task-manager": "~57.0.7",
    });

    const config = readJson<AppConfig>(fromRoot("app-next", "app.json"));
    // Found by name, not by position. #80, #82 and #83 each landed a guardrail
    // asserting its own plugin was `.at(-1)`, and only one entry can be last —
    // `withScreenTimeExtensionValidation` holds that slot because a validator
    // must run after everything it validates. What matters here is the plugin's
    // configuration, which position does not affect.
    const locationPlugin = config.expo?.plugins?.find(
      (plugin): plugin is [string, Record<string, unknown>] =>
        Array.isArray(plugin) && plugin[0] === "expo-location",
    );

    expect(locationPlugin).toEqual([
      "expo-location",
      {
        isIosBackgroundLocationEnabled: true,
        locationWhenInUsePermission:
          "Allow ExcerLock to check whether you are at a saved gym and keep a Walk Session active.",
        locationAlwaysAndWhenInUsePermission:
          "Allow ExcerLock to detect arrivals at saved gyms when you opt into auto-detect.",
      },
    ]);
  });

  it("loads background task definitions from the application entry bundle", () => {
    const rootLayout = readUtf8(fromRoot("app-next", "app", "_layout.tsx"));

    expect(rootLayout).toMatch(
      /import ["']\.\.\/src\/engine\/signals\/location\/registerLocationTasks["'];/,
    );
  });
});
