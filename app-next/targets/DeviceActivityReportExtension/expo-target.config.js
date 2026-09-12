const NATIVE_TEAM_ID = "AX3C2B78YD";
const { appGroupIdentifier, bundleIdentifier } = require("../../plugins/linkedRecorderResearchConfig");

module.exports = () => ({
  type: "device-activity-report",
  name: "DeviceActivityReportExtension",
  bundleIdentifier: bundleIdentifier("report"),
  appleTeamId: NATIVE_TEAM_ID,
  deploymentTarget: "17.4",
  frameworks: ["DeviceActivity", "SwiftUI"],
  entitlements: {
    "com.apple.developer.family-controls": true,
    "com.apple.security.application-groups": [appGroupIdentifier()],
  },
});
