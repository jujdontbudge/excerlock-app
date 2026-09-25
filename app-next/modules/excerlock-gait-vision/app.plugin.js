const { withInfoPlist } = require("expo/config-plugins");

const CAMERA_USAGE_DESCRIPTION =
  "Allow ExcerLock to use the front camera to verify treadmill walking while the app is open.";

function withExcerlockGaitVision(config) {
  return withInfoPlist(config, (nextConfig) => {
    nextConfig.modResults.NSCameraUsageDescription = CAMERA_USAGE_DESCRIPTION;
    return nextConfig;
  });
}

module.exports = withExcerlockGaitVision;
