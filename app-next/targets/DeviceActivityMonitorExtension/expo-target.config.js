const {
  createConfig,
} = require("react-native-device-activity/config-plugin/createExpoTargetConfig");

const createDeviceActivityMonitorConfig = createConfig("device-activity-monitor");

module.exports = (config) => ({
  ...createDeviceActivityMonitorConfig(config),
  appleTeamId: "AX3C2B78YD",
  bundleIdentifier: "com.johansardar.excerlock.monitor",
  deploymentTarget: "17.4",
  name: "DeviceActivityMonitorExtension",
});
