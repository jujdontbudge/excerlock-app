const fs = require("node:fs");
const path = require("node:path");
const { withDangerousMod } = require("expo/config-plugins");

const SOURCE = "privacy/PrivacyInfo.xcprivacy";
const DESTINATION = "ExcerLock/PrivacyInfo.xcprivacy";

function withPrivacyManifest(config) {
  return withDangerousMod(config, [
    "ios",
    (modConfig) => {
      const projectRoot = modConfig.modRequest.projectRoot;
      const platformRoot = modConfig.modRequest.platformProjectRoot;
      const source = path.join(projectRoot, SOURCE);
      const destination = path.join(platformRoot, DESTINATION);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(source, destination);
      return modConfig;
    },
  ]);
}

module.exports = withPrivacyManifest;
