const { IOSConfig, withFinalizedMod } = require("expo/config-plugins");

const EXPECTED_TARGETS = [
  {
    name: "DeviceActivityMonitorExtension",
    bundleIdentifier: "com.johansardar.excerlock.monitor",
  },
  {
    name: "ShieldConfiguration",
    bundleIdentifier: "com.johansardar.excerlock.shield",
  },
  {
    name: "ShieldAction",
    bundleIdentifier: "com.johansardar.excerlock.shieldaction",
  },
];

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

function assertTarget(project, expected) {
  const target = Object.entries(project.pbxNativeTargetSection()).find(
    ([key, candidate]) =>
      !key.endsWith("_comment") && withoutQuotes(candidate.name) === expected.name,
  )?.[1];
  if (!target) {
    throw new Error(
      `Screen Time prebuild did not generate the ${expected.name} target`,
    );
  }

  const configurations = buildConfigurations(project, target);
  if (configurations.length === 0) {
    throw new Error(`${expected.name} has no Xcode build configurations`);
  }

  for (const configuration of configurations) {
    const settings = configuration.buildSettings ?? {};
    if (withoutQuotes(settings.PRODUCT_BUNDLE_IDENTIFIER) !== expected.bundleIdentifier) {
      throw new Error(`${expected.name} lost its canonical bundle identifier`);
    }
    if (withoutQuotes(settings.IPHONEOS_DEPLOYMENT_TARGET) !== "17.4") {
      throw new Error(`${expected.name} must keep the iOS 17.4 deployment target`);
    }
    if (withoutQuotes(settings.DEVELOPMENT_TEAM) !== "AX3C2B78YD") {
      throw new Error(`${expected.name} must use Apple team AX3C2B78YD`);
    }
    if (!withoutQuotes(settings.CODE_SIGN_ENTITLEMENTS)?.endsWith("generated.entitlements")) {
      throw new Error(`${expected.name} lost its generated entitlements file`);
    }
  }
}

/**
 * Postcondition for the installed Screen Time package's Apple-target plugin.
 * It intentionally validates rather than recreates the package-owned generator.
 *
 * @param {import("expo/config").ExpoConfig} config
 */
function withScreenTimeExtensionValidation(config) {
  return withFinalizedMod(config, ["ios", (modConfig) => {
    const project = IOSConfig.XcodeUtils.getPbxproj(
      modConfig.modRequest.projectRoot,
    );
    for (const expected of EXPECTED_TARGETS) {
      assertTarget(project, expected);
    }
    return modConfig;
  }]);
}

module.exports = withScreenTimeExtensionValidation;
