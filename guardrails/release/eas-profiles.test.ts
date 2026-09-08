import { describe, expect, it } from "vitest";

import { APP_IDENTITY, readReleaseEasConfig } from "./release-app";

describe("EAS profiles of the release app", () => {
  const eas = readReleaseEasConfig();

  it("tracks the build number on EAS, not in the working tree", () => {
    expect(eas.cli?.appVersionSource).toBe("remote");
  });

  it("keeps device work on a signed native development client", () => {
    expect(eas.build?.development).toMatchObject({
      developmentClient: true,
      distribution: "internal",
      ios: { simulator: false },
    });
    expect(eas.build?.development?.withoutCredentials).not.toBe(true);
  });

  it("builds preview and production for the store so eas submit can reach TestFlight", () => {
    for (const name of ["preview", "production"] as const) {
      const profile = eas.build?.[name];
      expect(profile, `${name} profile missing`).toBeDefined();
      // Ad-hoc ("internal") builds cannot be submitted; TestFlight needs a store build.
      expect(profile?.distribution ?? "store", `${name} must be a store build`).toBe("store");
      expect(profile?.developmentClient, `${name} must not be a dev client`).not.toBe(true);
      expect(profile?.ios?.simulator, `${name} must not be a simulator build`).not.toBe(true);
      expect(profile?.withoutCredentials, `${name} must be signed`).not.toBe(true);
      expect(profile?.autoIncrement, `${name} must bump the remote build number`).toBe(true);
    }
  });

  it("never enables the developer surface or the E2E surface in a store build", () => {
    for (const name of ["preview", "production"] as const) {
      const env = eas.build?.[name]?.env ?? {};
      expect(env.EXPO_PUBLIC_DEV_MENU, `${name} enables the dev menu`).not.toBe("1");
      expect(env.EXPO_PUBLIC_E2E, `${name} enables the E2E surface`).not.toBe("1");
    }
  });

  it("has no Maestro e2e profile", () => {
    expect(eas.build?.e2e).toBeUndefined();
  });

  it("submits to the existing App Store Connect record with one submit owner", () => {
    for (const name of ["preview", "production"] as const) {
      expect(eas.submit?.[name]?.ios).toEqual({
        ascAppId: APP_IDENTITY.ascAppId,
        appleTeamId: APP_IDENTITY.appleTeamId,
      });
    }
  });
});
