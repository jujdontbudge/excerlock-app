const fs = require("node:fs");
const path = require("node:path");
const {
  IOSConfig,
  withXcodeProject,
} = require("expo/config-plugins");

const INTENT_FILENAME = "OpenExcerLockIntent.swift";
const INTENT_SOURCE = path.join("..", "app-intents", INTENT_FILENAME);
const APP_INTENTS_FRAMEWORK = "AppIntents.framework";

/**
 * Links the main-app App Intent source into the application target and
 * ensures the AppIntents framework membership, idempotently.
 *
 * The intent lives in the MAIN app target (main+four appex, no fifth appex,
 * no Siri entitlement solely for AppIntent). `import AppIntents` auto-links
 * the framework at compile time on modern Xcode; the explicit PBX frameworks
 * entry below keeps the membership visible and deterministic.
 *
 * Idempotent on every prebuild: the source bytes are rewritten only when
 * different, `hasFile` skips re-adding an existing source member, and the
 * underlying `addFramework` returns false (no duplicate) when
 * `AppIntents.framework` is already linked.
 *
 * Classic `withXcodeProject` (same mechanism as the HealthKit bridge source)
 * so the change lands on disk before the apple-targets Beta phase rewrites
 * the project file.
 *
 * @param {import("expo/config").ExpoConfig} config
 */
function withMainAppIntent(config) {
  return withXcodeProject(config, (modConfig) => {
    const project = modConfig.modResults;
    const projectRoot = modConfig.modRequest.projectRoot;
    const nativeProjectRoot = modConfig.modRequest.platformProjectRoot;
    const projectName = IOSConfig.XcodeUtils.getProjectName(projectRoot);
    const target = project.getTarget("com.apple.product-type.application");
    if (!target) {
      throw new Error("withMainAppIntent: could not locate the application target");
    }

    const sourcePath = path.join(__dirname, INTENT_SOURCE);
    if (!fs.existsSync(sourcePath)) {
      throw new Error(
        `withMainAppIntent: missing app-intents/${INTENT_FILENAME} source`,
      );
    }
    const relativePath = path.join(projectName, INTENT_FILENAME);
    const generatedPath = path.join(nativeProjectRoot, relativePath);
    const sourceContents = fs.readFileSync(sourcePath, "utf8");
    const existingContents = fs.existsSync(generatedPath)
      ? fs.readFileSync(generatedPath, "utf8")
      : null;
    if (existingContents !== sourceContents) {
      fs.mkdirSync(path.dirname(generatedPath), { recursive: true });
      fs.writeFileSync(generatedPath, sourceContents);
    }

    if (!project.hasFile(relativePath)) {
      IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
        filepath: relativePath,
        groupName: projectName,
        project,
        targetUuid: target.uuid,
      });
    }

    IOSConfig.XcodeUtils.addFramework({
      project,
      projectName,
      framework: APP_INTENTS_FRAMEWORK,
    });

    return modConfig;
  });
}

module.exports = withMainAppIntent;
