const {
  createConfig,
} = require("react-native-device-activity/config-plugin/createExpoTargetConfig");

const createShieldConfigurationConfig = createConfig("shield-configuration");

module.exports = (config) => ({
  ...createShieldConfigurationConfig(config),
  appleTeamId: "AX3C2B78YD",
  bundleIdentifier: "com.johansardar.excerlock.shield",
  deploymentTarget: "17.4",
});
