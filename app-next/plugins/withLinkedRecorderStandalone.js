const fs = require("node:fs");
const path = require("node:path");
const plist = require("@expo/plist").default;
const { XcodeProject } = require("@bacons/xcode");
const { build: buildXcodeProject } = require("@bacons/xcode/build/json");
const { withFinalizedMod } = require("expo/config-plugins");
const { DEV_CLIENT_MODULES, standaloneEnabled } = require("./linkedRecorderResearchConfig");

// The standalone Trace Lab build is a Release artifact with an embedded JS
// bundle. Expo autolinks expo-dev-client (launcher, menu and menu interface)
// in every configuration regardless of the plugin list, so the generated
// Podfile must exclude those modules for this build only; Metro-served `dev`
// research builds keep the launcher.
const EXCLUDED_MODULES = DEV_CLIENT_MODULES;
const EXCLUDED_CALL = `use_expo_modules!({ exclude: [${EXCLUDED_MODULES.map((name) => `'${name}'`).join(", ")}] })`;

// Signing: this Mac has no Xcode account signed in, so automatic signing falls
// back to the wildcard team profile and fails the Family Controls/App Group
// entitlements. The lab Device/Development profiles are already installed;
// pin them per target. Overridable for another Mac with different profile names.
const LAB_PROFILE_ENV = {
  ExcerLock: ["EXCERLOCK_LAB_PROFILE_APP", "ExcerLock Trace Lab Development"],
  DeviceActivityMonitorExtension: ["EXCERLOCK_LAB_PROFILE_MONITOR", "ExcerLock Trace Lab Monitor Development"],
  ShieldConfiguration: ["EXCERLOCK_LAB_PROFILE_SHIELD", "ExcerLock Trace Lab Shield Development"],
  ShieldAction: ["EXCERLOCK_LAB_PROFILE_SHIELD_ACTION", "ExcerLock Trace Lab Shield Action Development"],
  DeviceActivityReportExtension: ["EXCERLOCK_LAB_PROFILE_REPORT", "ExcerLock Trace Lab Report Development"],
};

function patchPodfile(contents) {
  if (contents.includes(EXCLUDED_CALL)) return contents;
  // Only the generated bare call is patchable; a Podfile that already passes
  // options is a template change and must fail closed rather than guess.
  const patched = contents.replace(/(^|[^\w])use_expo_modules!(?![({])/, `$1${EXCLUDED_CALL}`);
  if (patched === contents) {
    throw new Error(
      `Linked Recorder standalone prebuild could not exclude ${EXCLUDED_MODULES.join(", ")} from the generated Podfile`,
    );
  }
  return patched;
}

function stripDevClientFromInfo(info) {
  if (Array.isArray(info.CFBundleURLTypes)) {
    info.CFBundleURLTypes = info.CFBundleURLTypes
      .map((type) => ({
        ...type,
        CFBundleURLSchemes: (Array.isArray(type.CFBundleURLSchemes) ? type.CFBundleURLSchemes : []).filter(
          (scheme) => !String(scheme).startsWith("exp+") && String(scheme) !== "expo-development-client",
        ),
      }))
      .filter((type) => type.CFBundleURLSchemes.length > 0);
  }
  if (Array.isArray(info.NSBonjourServices)) {
    info.NSBonjourServices = info.NSBonjourServices.filter(
      (service) => String(service).replace(/\.$/, "") !== "_expo._tcp",
    );
    if (info.NSBonjourServices.length === 0) delete info.NSBonjourServices;
  }
  if (
    typeof info.NSLocalNetworkUsageDescription === "string" &&
    info.NSLocalNetworkUsageDescription.includes("Expo Dev Launcher")
  ) {
    delete info.NSLocalNetworkUsageDescription;
  }
  delete info.DEV_CLIENT_DEFAULT_LAUNCHER_URL;
  delete info.DEV_CLIENT_TRY_TO_LAUNCH_LAST_BUNDLE;
  return info;
}

function betaTargets(betaProject) {
  const targets = betaProject?.rootObject?.props?.targets ?? betaProject?.rootObject?.targets ?? [];
  return (Array.isArray(targets) ? targets : []).filter(
    (target) => target && typeof target.getDefaultBuildSetting === "function" && typeof target.props?.productName === "string",
  );
}

function labProfileSpecifier(targetName, env = process.env) {
  const entry = LAB_PROFILE_ENV[targetName];
  if (!entry) return null;
  return env[entry[0]] || entry[1];
}

/**
 * `@kingstinct/expo-apple-targets` writes the Beta project file during the
 * base-mod phase, before finalized mods run, so signing must be applied to the
 * file on disk rather than the (already written) in-memory project.
 */
function pinLabSigningTargets(projectPath) {
  const project = XcodeProject.open(projectPath);
  const targets = betaTargets(project);
  if (targets.length === 0) {
    throw new Error(
      "Linked Recorder standalone prebuild requires the @bacons/xcode project; refusing to sign with wildcard profiles",
    );
  }
  for (const targetName of Object.keys(LAB_PROFILE_ENV)) {
    const specifier = labProfileSpecifier(targetName);
    const target = targets.find((candidate) => candidate.props.productName === targetName);
    if (!target) throw new Error(`Linked Recorder standalone prebuild found no ${targetName} target`);
    target.setBuildSetting("CODE_SIGN_STYLE", "Manual");
    target.setBuildSetting("CODE_SIGN_IDENTITY", "Apple Development");
    target.setBuildSetting("PROVISIONING_PROFILE_SPECIFIER", specifier);
  }
  fs.writeFileSync(projectPath, buildXcodeProject(project.toJSON()));
  // Re-read: a later writer must not silently drop the standalone signing.
  const written = XcodeProject.open(projectPath);
  for (const targetName of Object.keys(LAB_PROFILE_ENV)) {
    const specifier = labProfileSpecifier(targetName);
    const target = betaTargets(written).find((candidate) => candidate.props.productName === targetName);
    if (target?.getDefaultBuildSetting("PROVISIONING_PROFILE_SPECIFIER") !== specifier) {
      throw new Error(`Linked Recorder standalone prebuild lost the ${targetName} signing profile`);
    }
  }
}

/**
 * Applied only for `EXCERLOCK_ENV=lab EXCERLOCK_LINKED_RECORDER_TRACE=1`.
 * Uses a finalized mod so the Podfile, Info.plist and Xcode project exist and
 * every other mutation has already run; `pod install` still runs after
 * prebuild's config-plugin phase.
 *
 * @param {import("expo/config").ExpoConfig} config
 */
function withLinkedRecorderStandalone(config) {
  return withFinalizedMod(config, ["ios", (modConfig) => {
    if (!standaloneEnabled()) return modConfig;

    const podfile = path.join(modConfig.modRequest.platformProjectRoot, "Podfile");
    if (!fs.existsSync(podfile)) {
      throw new Error("Linked Recorder standalone prebuild found no generated Podfile");
    }
    const podfileContents = fs.readFileSync(podfile, "utf8");
    const patchedPodfile = patchPodfile(podfileContents);
    if (patchedPodfile !== podfileContents) fs.writeFileSync(podfile, patchedPodfile);

    const projectName = modConfig.modRequest.projectName ?? "ExcerLock";
    const infoPlist = path.join(modConfig.modRequest.platformProjectRoot, projectName, "Info.plist");
    if (!fs.existsSync(infoPlist)) {
      throw new Error(`Linked Recorder standalone prebuild found no ${projectName}/Info.plist`);
    }
    fs.writeFileSync(infoPlist, plist.build(stripDevClientFromInfo(plist.parse(fs.readFileSync(infoPlist, "utf8")))));

    const pbxproj = path.join(modConfig.modRequest.platformProjectRoot, `${projectName}.xcodeproj`, "project.pbxproj");
    if (!fs.existsSync(pbxproj)) {
      throw new Error(`Linked Recorder standalone prebuild found no ${projectName}.xcodeproj/project.pbxproj`);
    }
    pinLabSigningTargets(pbxproj);
    return modConfig;
  }]);
}

module.exports = withLinkedRecorderStandalone;
module.exports.patchPodfile = patchPodfile;
module.exports.stripDevClientFromInfo = stripDevClientFromInfo;
module.exports.pinLabSigningTargets = pinLabSigningTargets;
module.exports.EXCLUDED_CALL = EXCLUDED_CALL;
