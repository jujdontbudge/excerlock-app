const { withInfoPlist } = require("expo/config-plugins");

const MOTION_USAGE_DESCRIPTION =
  "ExcerLock uses Motion & Fitness data to verify that you're walking during Walk & Scroll sessions.";

function withExcerlockMotion(config) {
  return withInfoPlist(config, (nextConfig) => {
    nextConfig.modResults.NSMotionUsageDescription = MOTION_USAGE_DESCRIPTION;
    return nextConfig;
  });
}

module.exports = withExcerlockMotion;
