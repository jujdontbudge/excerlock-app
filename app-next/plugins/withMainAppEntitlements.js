const { IOSConfig, withFinalizedMod } = require("expo/config-plugins");

const MAIN_ENTITLEMENTS_SUFFIX = "ExcerLock/ExcerLock.entitlements";

function withoutQuotes(value) {
  return typeof value === "string" ? value.replace(/^"|"$/g, "") : value;
}

function buildConfigurations(project, target) {
  const configurationList = project.pbxXCConfigurationList()[target.buildConfigurationList];
  if (!configurationList) {
    return [];
  }
  const section = project.pbxXCBuildConfigurationSection();
  return configurationList.buildConfigurations.flatMap(({ value }) => {
    const configuration = section[value];
    return configuration ? [configuration] : [];
  });
}

/**
 * Ledger guard: every app-target build configuration's CODE_SIGN_ENTITLEMENTS
 * must point at ios/ExcerLock/ExcerLock.entitlements. A stale or
 * `undefined.entitlements` reference ships an executable without its
 * capabilities (Family Controls, HealthKit, App Groups, Sign in with Apple,
 * push, associated domains). Fails prebuild otherwise.
 *
 * Finalized so it reads the generated project after every other Xcode
 * mutation has linked the entitlements file. Both this guard and the Screen
 * Time validator use `withFinalizedMod` postconditions; neither relies on
 * plugin-list position for ordering (Expo does not guarantee global LIFO
 * across interceptor kinds).
 *
 * @param {import("expo/config").ExpoConfig} config
 */
function withMainAppEntitlements(config) {
  return withFinalizedMod(config, ["ios", (modConfig) => {
    const project = IOSConfig.XcodeUtils.getPbxproj(
      modConfig.modRequest.projectRoot,
    );
    const section = project.pbxNativeTargetSection();
    const appTargets = Object.entries(section).filter(
      ([key, candidate]) =>
        !key.endsWith("_comment") &&
        withoutQuotes(candidate.productType) === "com.apple.product-type.application",
    );
    if (appTargets.length === 0) {
      throw new Error(
        "withMainAppEntitlements: no application target found in the Xcode project",
      );
    }
    for (const [, target] of appTargets) {
      const configurations = buildConfigurations(project, target);
      if (configurations.length === 0) {
        throw new Error(
          "withMainAppEntitlements: app target has no build configurations",
        );
      }
      for (const configuration of configurations) {
        const settings = configuration.buildSettings ?? {};
        const entitlements = withoutQuotes(settings.CODE_SIGN_ENTITLEMENTS);
        if (
          typeof entitlements !== "string" ||
          !entitlements.endsWith(MAIN_ENTITLEMENTS_SUFFIX)
        ) {
          throw new Error(
            `withMainAppEntitlements: app target CODE_SIGN_ENTITLEMENTS must point at ${MAIN_ENTITLEMENTS_SUFFIX} (got ${String(entitlements)})`,
          );
        }
      }
    }
    return modConfig;
  }]);
}

module.exports = withMainAppEntitlements;
