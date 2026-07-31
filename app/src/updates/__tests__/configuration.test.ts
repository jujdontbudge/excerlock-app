import appConfig from "../../../app.json";
import easConfig from "../../../eas.json";

describe("EAS Update configuration", () => {
  it("pins OTA compatibility to app versions and the linked EAS project", () => {
    expect(appConfig.expo.runtimeVersion).toEqual({ policy: "appVersion" });
    expect(appConfig.expo.updates.url).toMatch(
      /^https:\/\/u\.expo\.dev\/[0-9a-f-]{36}$/,
    );
    expect(appConfig.expo.extra.eas.projectId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("separates preview and production binaries onto matching channels", () => {
    expect(easConfig.build.preview).toMatchObject({
      channel: "preview",
      distribution: "internal",
    });
    expect(easConfig.build.production).toMatchObject({ channel: "production" });
  });

  it("keeps the Screen Time config validator last after OTA setup", () => {
    expect(appConfig.expo.plugins.at(-1)).toBe(
      "./plugins/withScreenTimeExtensionValidation",
    );
  });
});
