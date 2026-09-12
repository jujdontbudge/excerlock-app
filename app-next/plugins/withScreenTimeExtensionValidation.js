const fs = require("node:fs");
const path = require("node:path");
const { IOSConfig, withFinalizedMod } = require("expo/config-plugins");
const { bundleIdentifier, researchEnabled } = require("./linkedRecorderResearchConfig");

// Main app + FOUR Screen Time appex. The App Intent lives in the main app
// target (see plugins/withMainAppIntent.js); there is no fifth appex.
function expectedAppexTargets() {
  return [
    {
      name: "DeviceActivityMonitorExtension",
      bundleIdentifier: bundleIdentifier("monitor", "com.johansardar.excerlock.monitor"),
    },
    {
      name: "ShieldConfiguration",
      bundleIdentifier: bundleIdentifier("shield", "com.johansardar.excerlock.shield"),
    },
    {
      name: "ShieldAction",
      bundleIdentifier: bundleIdentifier("shieldaction", "com.johansardar.excerlock.shieldaction"),
    },
    {
      name: "DeviceActivityReportExtension",
      bundleIdentifier: bundleIdentifier("report", "com.johansardar.excerlock.report"),
      productType: "com.apple.product-type.extensionkit-extension",
    },
  ];
}

const EXPECTED_APP_COUNT = 1;
const EXPECTED_APPEX_COUNT = expectedAppexTargets().length;

// Capabilities that belong to the main app only and must never be demanded
// on (or leak onto) an extension. Provisioning/signing-generated entries
// (application-identifier, team identifier, keychain-access-groups,
// get-task-allow) are always permitted wherever the signer adds them.
const MAIN_ONLY_CAPABILITIES = [
  "com.apple.developer.healthkit",
  "com.apple.developer.applesignin",
  "aps-environment",
  "com.apple.developer.associated-domains",
];

const MONITOR_PACKAGE_SOURCES = [
  {
    destination: "EnforcementPolicy.generated.swift",
    localSource: path.join("modules", "excerlock-enforcement", "ios", "EnforcementPolicy.swift"),
  },
];
const LINKED_TRACE_MONITOR_SOURCE = {
  destination: "LinkedTraceWriter.generated.swift",
  localSource: path.join("modules", "excerlock-enforcement", "ios", "LinkedTraceWriter.swift"),
};

function materializeMonitorSources(projectRoot) {
  const targetRoot = path.join(
    projectRoot,
    "targets",
    "DeviceActivityMonitorExtension",
  );
  fs.mkdirSync(targetRoot, { recursive: true });
  // The guarded extension is repo-owned in targetRoot. Remove the old package
  // materialization so it can never contribute a second, unguarded delegate.
  fs.rmSync(path.join(targetRoot, "DeviceActivityMonitorExtension.generated.swift"), { force: true });
  fs.rmSync(path.join(targetRoot, "PackageRuntime.generated.swift"), { force: true });
  fs.rmSync(path.join(targetRoot, LINKED_TRACE_MONITOR_SOURCE.destination), { force: true });

  const sources = researchEnabled()
    ? [...MONITOR_PACKAGE_SOURCES, LINKED_TRACE_MONITOR_SOURCE]
    : MONITOR_PACKAGE_SOURCES;
  for (const source of sources) {
    const sourcePath = path.join(projectRoot, source.localSource);
    const destinationPath = path.join(targetRoot, source.destination);
    fs.copyFileSync(sourcePath, destinationPath);
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

function assertAppexTarget(project, expected) {
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
  if (
    expected.productType &&
    withoutQuotes(target[1].productType) !== expected.productType
  ) {
    throw new Error(
      `${expected.name} must use ${expected.productType}, got ${withoutQuotes(target[1].productType)}`,
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
    const conditions = withoutQuotes(settings.SWIFT_ACTIVE_COMPILATION_CONDITIONS) ?? "";
    const shouldTrace = researchEnabled() && expected.name === "DeviceActivityMonitorExtension";
    if (shouldTrace !== conditions.split(/\s+/).includes("EXCERLOCK_LINKED_RECORDER_TRACE")) {
      throw new Error(`${expected.name} has an invalid Linked Recorder trace compilation condition`);
    }
  }
}

function assertTargetCountsClassic(project) {
  const entries = Object.entries(project.pbxNativeTargetSection()).filter(
    ([key]) => !key.endsWith("_comment"),
  );
  const apps = entries.filter(
    ([, candidate]) =>
      withoutQuotes(candidate.productType) === "com.apple.product-type.application",
  );
  const appex = entries.filter(([, candidate]) => {
    const productType = withoutQuotes(candidate.productType);
    return (
      productType === "com.apple.product-type.app-extension" ||
      productType === "com.apple.product-type.extensionkit-extension"
    );
  });
  if (apps.length !== EXPECTED_APP_COUNT || appex.length !== EXPECTED_APPEX_COUNT) {
    const names = entries.map(([, candidate]) => withoutQuotes(candidate.name));
    throw new Error(
      `Screen Time prebuild must generate main+${EXPECTED_APPEX_COUNT} appex (got ${apps.length} app + ${appex.length} appex: ${names.join(", ") || "none"})`,
    );
  }
  const staleCopy = entries.find(([, candidate]) =>
    withoutQuotes(candidate.name).includes("ActivityMonitorExtension") &&
    withoutQuotes(candidate.name) !== "DeviceActivityMonitorExtension",
  );
  if (staleCopy) {
    throw new Error(
      "Stale package-copy target present (copyToTargetFolder:false): remove targets/ActivityMonitorExtension",
    );
  }
}

/**
 * T01 port adaptation (B12): `react-native-device-activity@0.6.1` generates
 * its appex through `@kingstinct/expo-apple-targets`, which edits the Xcode
 * project in the `@bacons/xcode` Beta model and writes the file after
 * finalized mods run. The classic `getPbxproj` disk read therefore sees the
 * template on clean prebuilds (never the new targets), so it cannot be the
 * prebuild-fail-fast mechanism. Read the Beta in-memory project that the
 * provider saved to `_internal.modResults.ios.xcodeProjectBeta2` instead;
 * the classic disk read stays only as a diagnostic fallback.
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

function betaProductType(target) {
  return target.props?.productType ?? target.props?.producttype ?? "";
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
  if (expected.productType && betaProductType(target) !== expected.productType) {
    throw new Error(
      `${expected.name} must use ${expected.productType}, got ${betaProductType(target)}`,
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
  const conditions = settingsOf("SWIFT_ACTIVE_COMPILATION_CONDITIONS") ?? "";
  const shouldTrace = researchEnabled() && expected.name === "DeviceActivityMonitorExtension";
  if (shouldTrace !== conditions.split(/\s+/).includes("EXCERLOCK_LINKED_RECORDER_TRACE")) {
    throw new Error(`${expected.name} has an invalid Linked Recorder trace compilation condition`);
  }
}

function assertTargetCountsBeta(betaProject) {
  const targets = betaTargets(betaProject);
  const apps = targets.filter(
    (target) => betaProductType(target) === "com.apple.product-type.application",
  );
  const appex = targets.filter((target) => {
    const productType = betaProductType(target);
    return (
      productType === "com.apple.product-type.app-extension" ||
      productType === "com.apple.product-type.extensionkit-extension"
    );
  });
  if (apps.length !== EXPECTED_APP_COUNT || appex.length !== EXPECTED_APPEX_COUNT) {
    const names = targets.map((target) => target.props.productName);
    throw new Error(
      `Screen Time prebuild must generate main+${EXPECTED_APPEX_COUNT} appex (got ${apps.length} app + ${appex.length} appex: ${names.join(", ") || "none"})`,
    );
  }
  if (targets.some((target) => target.props.productName === "ActivityMonitorExtension")) {
    throw new Error(
      "Stale package-copy target present (copyToTargetFolder:false): remove targets/ActivityMonitorExtension",
    );
  }
  if (targets.some((target) => /intent/i.test(target.props.productName))) {
    throw new Error(
      "No fifth App Intents appex may exist: the intent lives in the main app target",
    );
  }
}

/**
 * The `generated.entitlements` files are written to disk by the apple-targets
 * config phase (before finalized mods run), so their contents are honestly
 * assertable here: Family Controls + App Groups, and none of the main-only
 * privileged capabilities. Signing-generated entries (application-identifier,
 * team identifier, keychain-access-groups, get-task-allow) are permitted.
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
  for (const privileged of MAIN_ONLY_CAPABILITIES) {
    if (privileged === "com.apple.developer.healthkit") {
      // Exact-key match: the background-delivery subkey contains the parent
      // string and belongs on extensions that need it — but ours must not
      // carry either; match the parent key line precisely.
      if (/(<key>|["'])com\.apple\.developer\.healthkit(<\/key>|["'])/.test(text)) {
        throw new Error(
          `${displayName} generated.entitlements must not carry main-only ${privileged}`,
        );
      }
      continue;
    }
    if (text.includes(privileged)) {
      throw new Error(
        `${displayName} generated.entitlements must not carry main-only ${privileged}`,
      );
    }
  }
}

/**
 * Postcondition for the installed Screen Time package's Apple-target plugin.
 * It intentionally validates rather than recreates the package-owned
 * generator. Registered with `withFinalizedMod` so it reads the generated
 * project after every other Xcode mutation; its position in the plugin list
 * is a readability convention, not an ordering mechanism (Expo does not
 * guarantee global LIFO across interceptor kinds).
 *
 * @param {import("expo/config").ExpoConfig} config
 */
function withScreenTimeExtensionValidation(config) {
  return withFinalizedMod(config, ["ios", (modConfig) => {
    materializeMonitorSources(modConfig.modRequest.projectRoot);
    const betaProject = betaProjectFromInternal(modConfig);
    if (betaProject && betaTargets(betaProject).length > 0) {
      for (const expected of expectedAppexTargets()) {
        assertBetaTarget(betaProject, expected);
      }
      assertTargetCountsBeta(betaProject);
    } else {
      const project = IOSConfig.XcodeUtils.getPbxproj(
        modConfig.modRequest.projectRoot,
      );
      for (const expected of expectedAppexTargets()) {
        assertAppexTarget(project, expected);
      }
      assertTargetCountsClassic(project);
    }
    const entitlementsByDir = {
      DeviceActivityMonitorExtension: "DeviceActivityMonitorExtension",
      ShieldConfiguration: "ShieldConfiguration",
      ShieldAction: "ShieldAction",
      DeviceActivityReportExtension: "DeviceActivityReportExtension",
    };
    for (const [directory, displayName] of Object.entries(entitlementsByDir)) {
      assertGeneratedEntitlementsFile(
        modConfig.modRequest.projectRoot,
        directory,
        displayName,
      );
    }
    return modConfig;
  }]);
}

module.exports = withScreenTimeExtensionValidation;
