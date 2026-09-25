const fs = require("node:fs");
const path = require("node:path");
const {
  IOSConfig,
  withAppDelegate,
  withEntitlementsPlist,
  withXcodeProject,
} = require("expo/config-plugins");

const BRIDGE_FILENAME = "HealthKitBackgroundBootstrap.mm";
const BRIDGE_DECLARATION = [
  '@_silgen_name("ExcerLockSetupHealthKitBackgroundDelivery")',
  "private func setupHealthKitBackgroundDelivery()",
].join("\n");
const BRIDGE_CALL = "    setupHealthKitBackgroundDelivery()";
const HEADER_SEARCH_PATHS = [
  '"$(inherited)"',
  '"$(PODS_ROOT)/Headers/Private/NitroModules"',
  '"\\"$(PODS_CONFIGURATION_BUILD_DIR)/ReactNativeHealthkit/Swift Compatibility Header\\""',
];

function withHealthKitEntitlements(config) {
  return withEntitlementsPlist(config, (modConfig) => {
    modConfig.modResults["com.apple.developer.healthkit"] = true;
    modConfig.modResults["com.apple.developer.healthkit.background-delivery"] = true;
    return modConfig;
  });
}

function withHealthKitAppDelegate(config) {
  return withAppDelegate(config, (modConfig) => {
    if (modConfig.modResults.language !== "swift") {
      throw new Error("HealthKit background bootstrap requires a Swift AppDelegate");
    }

    let contents = modConfig.modResults.contents;
    if (contents.includes("import ReactNativeHealthkit")) {
      throw new Error(
        "Set @kingstinct/react-native-healthkit background to false before applying the ExcerLock bootstrap",
      );
    }

    if (!contents.includes(BRIDGE_DECLARATION)) {
      const importAnchor = "import ReactAppDependencyProvider\n";
      if (!contents.includes(importAnchor)) {
        throw new Error("Could not locate the Expo AppDelegate import anchor");
      }
      contents = contents.replace(
        importAnchor,
        `${importAnchor}\n${BRIDGE_DECLARATION}\n`,
      );
    }

    if (!contents.includes(BRIDGE_CALL)) {
      const launchAnchor = "    let delegate = ReactNativeDelegate()";
      if (!contents.includes(launchAnchor)) {
        throw new Error("Could not locate the Expo AppDelegate launch anchor");
      }
      contents = contents.replace(
        launchAnchor,
        `${BRIDGE_CALL}\n${launchAnchor}`,
      );
    }

    modConfig.modResults.contents = contents;
    return modConfig;
  });
}

function withHealthKitBridgeSource(config) {
  return withXcodeProject(config, (modConfig) => {
    const project = modConfig.modResults;
    const projectRoot = modConfig.modRequest.projectRoot;
    const nativeProjectRoot = modConfig.modRequest.platformProjectRoot;
    const projectName = IOSConfig.XcodeUtils.getProjectName(projectRoot);
    const target = project.getTarget("com.apple.product-type.application");
    if (!target) {
      throw new Error("Could not locate the ExcerLock application target");
    }

    const sourcePath = path.join(__dirname, "healthkit", BRIDGE_FILENAME);
    const relativePath = path.join(projectName, BRIDGE_FILENAME);
    const generatedPath = path.join(nativeProjectRoot, relativePath);
    fs.mkdirSync(path.dirname(generatedPath), { recursive: true });
    fs.copyFileSync(sourcePath, generatedPath);

    if (!project.hasFile(relativePath)) {
      IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
        filepath: relativePath,
        groupName: projectName,
        project,
        targetUuid: target.uuid,
      });
    }

    const configurations = IOSConfig.XcodeUtils.getBuildConfigurationsForListId(
      project,
      target.target.buildConfigurationList,
    );
    for (const [, configuration] of configurations) {
      const settings = configuration.buildSettings ?? {};
      const existing = Array.isArray(settings.HEADER_SEARCH_PATHS)
        ? settings.HEADER_SEARCH_PATHS
        : settings.HEADER_SEARCH_PATHS
          ? [settings.HEADER_SEARCH_PATHS]
          : [];
      settings.HEADER_SEARCH_PATHS = [...new Set([...existing, ...HEADER_SEARCH_PATHS])];
      configuration.buildSettings = settings;
    }

    return modConfig;
  });
}

function withHealthKitBackgroundBootstrap(config) {
  config = withHealthKitEntitlements(config);
  config = withHealthKitAppDelegate(config);
  config = withHealthKitBridgeSource(config);
  return config;
}

module.exports = withHealthKitBackgroundBootstrap;
