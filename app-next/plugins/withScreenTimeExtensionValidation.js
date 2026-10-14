const fs = require("node:fs");
const path = require("node:path");
const { IOSConfig, withFinalizedMod } = require("expo/config-plugins");
const { appGroupIdentifier, bundleIdentifier, researchEnabled } = require("./linkedRecorderResearchConfig");

function expectedAppexTargets() {
  return [
    {
      name: "DeviceActivityMonitorExtension",
      bundleIdentifier: bundleIdentifier("monitor"),
    },
    {
      name: "ShieldConfiguration",
      bundleIdentifier: bundleIdentifier("shield"),
    },
    {
      name: "ShieldAction",
      bundleIdentifier: bundleIdentifier("shieldaction"),
    },
    {
      name: "DeviceActivityReportExtension",
      bundleIdentifier: bundleIdentifier("report"),
      productType: "com.apple.product-type.extensionkit-extension",
    },
  ];
}

const EXPECTED_APP_COUNT = 1;
const EXPECTED_APPEX_COUNT = expectedAppexTargets().length;

const MAIN_ONLY_CAPABILITIES = [
  "com.apple.developer.healthkit",
  "com.apple.developer.applesignin",
  "aps-environment",
  "com.apple.developer.associated-domains",
];

const MONITOR_PACKAGE_SOURCES = [
  {
    destination: "BankDrain.generated.swift",
    localSource: path.join("modules", "excerlock-enforcement", "ios", "BankDrain.swift"),
  },
  {
    destination: "ExcerlockAppGroup.generated.swift",
    localSource: path.join("modules", "excerlock-enforcement", "ios", "ExcerlockAppGroup.swift"),
  },
  {
    destination: "FamilyActivitySelectionCodec.generated.swift",
    localSource: path.join("modules", "excerlock-enforcement", "ios", "FamilyActivitySelectionCodec.swift"),
  },
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

function betaProjectFromInternal(modConfig) {
  const internal = modConfig._internal ?? modConfig.modRequest?._internal;
  const saved = internal?.modResults?.ios?.xcodeProjectBeta2;
  if (!saved) {
    return null;
  }
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

function assertGeneratedEntitlementsFile(projectRoot, directory, displayName) {
  const file = path.join(projectRoot, "targets", directory, "generated.entitlements");
  if (!fs.existsSync(file)) {
    throw new Error(`${displayName} is missing targets/${directory}/generated.entitlements`);
  }
  const text = fs.readFileSync(file, "utf8");
  if (!text.includes("com.apple.developer.family-controls")) {
    throw new Error(`${displayName} generated.entitlements is missing Family Controls`);
  }
  if (!text.includes(appGroupIdentifier())) {
    throw new Error(`${displayName} generated.entitlements is missing the configured app group`);
  }
  for (const privileged of MAIN_ONLY_CAPABILITIES) {
    if (privileged === "com.apple.developer.healthkit") {
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
