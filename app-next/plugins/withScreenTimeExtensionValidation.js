const fs = require("node:fs");
const path = require("node:path");
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

// T01 pending definitions (Astra resolving fifth-target detail; arch file
// absent 2026-09-10). The `.report` DeviceActivityReport bundle
// (`com.johansardar.excerlock.report`) exists in ASC and holds Family Controls
// approval with the other three Screen Time bundles, but
// `react-native-device-activity@0.6.1` / `@kingstinct/expo-apple-targets@0.1.19`
// expose no `device-activity-report` target type, so no valid Xcode appex can
// be generated here without fabricating an invalid extension point. The App
// Intents bundle must not inherit Family Controls. Both are preserved as
// pending target definitions under `targets/` (config + stub source, no Xcode
// target yet) and asserted as pending — never as signed appex — until tooling
// and review resolve them.
const PENDING_TARGETS = [
  {
    name: "DeviceActivityReportExtension",
    bundleIdentifier: "com.johansardar.excerlock.report",
    directory: "DeviceActivityReportExtension",
  },
  {
    name: "AppIntentsExtension",
    bundleIdentifier: "com.johansardar.excerlock.appintents",
    directory: "app-intents",
  },
];

const MONITOR_PACKAGE_SOURCES = [
  {
    destination: "DeviceActivityMonitorExtension.generated.swift",
    source: path.join(
      "targets",
      "ActivityMonitorExtension",
      "DeviceActivityMonitorExtension.swift",
    ),
  },
  {
    destination: "PackageRuntime.generated.swift",
    source: path.join("ios", "Shared.swift"),
  },
];

const LOCK_WINDOW_CONTEXT_HOOK =
  "    publishLockWindowShieldContext(activityName: activity.rawValue)\n\n";

function addLockWindowContextHook(source) {
  const insertionPoint = `    persistToUserDefaults(
      activityName: activity.rawValue,
      callbackName: "intervalDidStart"
    )`;
  if (!source.includes(insertionPoint)) {
    throw new Error(
      "Screen Time monitor source no longer exposes the lock-window hook point",
    );
  }
  return source.replace(insertionPoint, LOCK_WINDOW_CONTEXT_HOOK + insertionPoint);
}

function materializeMonitorSources(projectRoot) {
  const packageRoot = path.dirname(
    require.resolve("react-native-device-activity/package.json", {
      paths: [projectRoot],
    }),
  );
  const targetRoot = path.join(
    projectRoot,
    "targets",
    "DeviceActivityMonitorExtension",
  );
  fs.mkdirSync(targetRoot, { recursive: true });

  for (const source of MONITOR_PACKAGE_SOURCES) {
    const sourcePath = path.join(packageRoot, source.source);
    const destinationPath = path.join(targetRoot, source.destination);
    if (source.destination === "DeviceActivityMonitorExtension.generated.swift") {
      fs.writeFileSync(
        destinationPath,
        addLockWindowContextHook(fs.readFileSync(sourcePath, "utf8")),
      );
    } else {
      fs.copyFileSync(sourcePath, destinationPath);
    }
  }
}

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
    const names = Object.entries(project.pbxNativeTargetSection())
      .filter(([key]) => !key.endsWith("_comment"))
      .map(([, candidate]) => withoutQuotes(candidate.name));
    throw new Error(
      `Screen Time prebuild did not generate the ${expected.name} target (classic model has: ${names.join(", ") || "none"})`,
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
 * T01 port adaptation (B12): `react-native-device-activity@0.6.1` generates
 * its appex through `@kingstinct/expo-apple-targets`, which edits the Xcode
 * project in the `@bacons/xcode` Beta model and writes the file after
 * finalized mods run. The classic `getPbxproj` disk read above therefore sees
 * the template on clean prebuilds (never the new targets), so it can no
 * longer be the prebuild-fail-fast mechanism. Read the Beta in-memory project
 * that the provider saved to `_internal.modResults.ios.xcodeProjectBeta2`
 * instead; the classic disk read stays only as a diagnostic fallback.
 */
function betaProjectFromInternal(modConfig) {
  const internal = modConfig._internal ?? modConfig.modRequest?._internal;
  const saved = internal?.modResults?.ios?.xcodeProjectBeta2;
  if (!saved) {
    return null;
  }
  // saveToInternal stores `{ modResults }`-shaped results; the saved value is
  // the provider's modResults. Unwrap one level when it is a wrapper.
  return saved.modResults ?? saved;
}

function betaTargets(betaProject) {
  const targets =
    betaProject?.rootObject?.props?.targets ??
    betaProject?.rootObject?.targets ??
    [];
  return (Array.isArray(targets) ? targets : []).filter(
    (target) =>
      target &&
      typeof target.getDefaultBuildSetting === "function" &&
      typeof target.props?.productName === "string",
  );
}

function assertBetaTarget(betaProject, expected) {
  const targets = betaTargets(betaProject);
  const names = targets.map((target) => target.props.productName);
  const target = targets.find(
    (candidate) => candidate.props.productName === expected.name,
  );
  if (!target) {
    throw new Error(
      `Screen Time prebuild did not generate the ${expected.name} target (Beta model has: ${names.join(", ") || "none"})`,
    );
  }
  const settingsOf = (key) => {
    const value = target.getDefaultBuildSetting(key);
    return typeof value === "string" ? value.replace(/^"|"$/g, "") : value;
  };
  if (settingsOf("PRODUCT_BUNDLE_IDENTIFIER") !== expected.bundleIdentifier) {
    throw new Error(
      `${expected.name} lost its canonical bundle identifier (got ${String(settingsOf("PRODUCT_BUNDLE_IDENTIFIER"))})`,
    );
  }
  if (settingsOf("IPHONEOS_DEPLOYMENT_TARGET") !== "17.4") {
    throw new Error(`${expected.name} must keep the iOS 17.4 deployment target`);
  }
  if (settingsOf("DEVELOPMENT_TEAM") !== "AX3C2B78YD") {
    throw new Error(`${expected.name} must use Apple team AX3C2B78YD`);
  }
  const entitlements = settingsOf("CODE_SIGN_ENTITLEMENTS");
  if (typeof entitlements !== "string" || !entitlements.endsWith("generated.entitlements")) {
    throw new Error(`${expected.name} lost its generated entitlements file`);
  }
}

/**
 * The `generated.entitlements` files are written to disk by the apple-targets
 * config phase (before finalized mods run), so their contents are honestly
 * assertable here: Family Controls + App Groups, and none of the main-only
 * privileged capabilities.
 */
function assertGeneratedEntitlementsFile(projectRoot, directory, displayName) {
  const file = path.join(projectRoot, "targets", directory, "generated.entitlements");
  if (!fs.existsSync(file)) {
    throw new Error(`${displayName} is missing targets/${directory}/generated.entitlements`);
  }
  const text = fs.readFileSync(file, "utf8");
  if (!text.includes("com.apple.developer.family-controls")) {
    throw new Error(`${displayName} generated.entitlements is missing Family Controls`);
  }
  if (!text.includes("group.com.johansardar.excerlock")) {
    throw new Error(`${displayName} generated.entitlements is missing the app group`);
  }
  for (const privileged of [
    "com.apple.developer.healthkit",
    "com.apple.developer.applesignin",
    "aps-environment",
    "com.apple.developer.associated-domains",
  ]) {
    if (text.includes(privileged)) {
      throw new Error(
        `${displayName} generated.entitlements must not carry main-only ${privileged}`,
      );
    }
  }
}

/**
 * Postcondition for the installed Screen Time package's Apple-target plugin.
 * It intentionally validates rather than recreates the package-owned generator.
 *
 * @param {import("expo/config").ExpoConfig} config
 */
function assertPendingTargetDefinition(projectRoot, pending) {
  const dir = path.join(projectRoot, "targets", pending.directory);
  const configPath = path.join(dir, "expo-target.config.pending.js");
  if (!fs.existsSync(configPath)) {
    throw new Error(
      `${pending.name} is pending: missing ${pending.directory}/expo-target.config.pending.js (bundle ${pending.bundleIdentifier})`,
    );
  }
}

function withScreenTimeExtensionValidation(config) {
  return withFinalizedMod(config, ["ios", (modConfig) => {
    materializeMonitorSources(modConfig.modRequest.projectRoot);
    const betaProject = betaProjectFromInternal(modConfig);
    if (betaProject && betaTargets(betaProject).length > 0) {
      for (const expected of EXPECTED_TARGETS) {
        assertBetaTarget(betaProject, expected);
      }
    } else {
      const project = IOSConfig.XcodeUtils.getPbxproj(
        modConfig.modRequest.projectRoot,
      );
      for (const expected of EXPECTED_TARGETS) {
        assertTarget(project, expected);
      }
    }
    const entitlementsByDir = {
      DeviceActivityMonitorExtension: "DeviceActivityMonitorExtension",
      ShieldConfiguration: "ShieldConfiguration",
      ShieldAction: "ShieldAction",
    };
    for (const [directory, displayName] of Object.entries(entitlementsByDir)) {
      assertGeneratedEntitlementsFile(
        modConfig.modRequest.projectRoot,
        directory,
        displayName,
      );
    }
    for (const pending of PENDING_TARGETS) {
      assertPendingTargetDefinition(modConfig.modRequest.projectRoot, pending);
    }
    return modConfig;
  }]);
}

module.exports = withScreenTimeExtensionValidation;
