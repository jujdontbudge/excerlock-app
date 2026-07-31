import { describe, expect, it } from "vitest";

import { fromRoot, readJson } from "./repo-files";

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
      fromRoot("app", "package.json"),
    );
    expect(packageJson.dependencies).toMatchObject({
      "expo-location": "~57.0.7",
      "expo-task-manager": "~57.0.7",
    });

    const config = readJson<AppConfig>(fromRoot("app", "app.json"));
    const locationPlugin = config.expo?.plugins?.at(-1);

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
});
