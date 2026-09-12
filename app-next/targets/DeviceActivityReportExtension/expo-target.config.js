const NATIVE_TEAM_ID = "AX3C2B78YD";
const NATIVE_APP_GROUP = "group.com.johansardar.excerlock";
const { bundleIdentifier } = require("../../plugins/linkedRecorderResearchConfig");

module.exports = () => ({
  type: "device-activity-report",
  name: "DeviceActivityReportExtension",
  bundleIdentifier: bundleIdentifier("report", "com.johansardar.excerlock.report"),
  appleTeamId: NATIVE_TEAM_ID,
  deploymentTarget: "17.4",
  frameworks: ["DeviceActivity", "SwiftUI"],
  entitlements: {
    "com.apple.developer.family-controls": true,
    "com.apple.security.application-groups": [NATIVE_APP_GROUP],
  },
});
