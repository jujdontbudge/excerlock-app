import { describe, expect, it } from "vitest";

import { fromRoot, readJson } from "./repo-files";

type AppConfig = {
  expo?: {
    plugins?: Array<string | [string, ...unknown[]]>;
  };
};

describe("Expo plugin-order guardrail", () => {
  it("keeps withNoPush first in the app config", () => {
    const config = readJson<AppConfig>(fromRoot("app", "app.json"));
    const firstPlugin = config.expo?.plugins?.[0];
    const firstPluginName = Array.isArray(firstPlugin) ? firstPlugin[0] : firstPlugin;

    expect(
      firstPluginName,
      "withNoPush must remain first because Expo config plugins apply in LIFO order",
    ).toBe("./plugins/withNoPush");
  });
});
