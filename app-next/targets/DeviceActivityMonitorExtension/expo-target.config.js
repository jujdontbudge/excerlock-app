const {
  createConfig,
} = require("react-native-device-activity/config-plugin/createExpoTargetConfig");

const createDeviceActivityMonitorConfig = createConfig("device-activity-monitor");
const { bundleIdentifier, researchEnabled } = require("../../plugins/linkedRecorderResearchConfig");

module.exports = (config) => ({
  ...createDeviceActivityMonitorConfig(config),
  appleTeamId: "AX3C2B78YD",
  bundleIdentifier: bundleIdentifier("monitor", "com.johansardar.excerlock.monitor"),
  deploymentTarget: "17.4",
  swiftActiveCompilationConditions: researchEnabled() ? ["EXCERLOCK_LINKED_RECORDER_TRACE"] : [],
  name: "DeviceActivityMonitorExtension",
});
