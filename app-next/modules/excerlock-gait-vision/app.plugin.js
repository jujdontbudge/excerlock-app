const { withInfoPlist } = require("expo/config-plugins");

const CAMERA_USAGE_DESCRIPTION =
  "Check that you are walking when your phone is propped on the treadmill. " +
  "Frames are processed on this iPhone, never recorded or sent.";

/** @type {import("expo/config-plugins").ConfigPlugin} */
function withExcerlockGaitVision(config) {
  return withInfoPlist(config, (nextConfig) => {
    nextConfig.modResults.NSCameraUsageDescription = CAMERA_USAGE_DESCRIPTION;
    return nextConfig;
  });
}

module.exports = withExcerlockGaitVision;
