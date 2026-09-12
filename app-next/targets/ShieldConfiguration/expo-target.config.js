const {
  createConfig,
} = require("react-native-device-activity/config-plugin/createExpoTargetConfig");

const createShieldConfigurationConfig = createConfig("shield-configuration");
const { bundleIdentifier } = require("../../plugins/linkedRecorderResearchConfig");

module.exports = (config) => ({
  ...createShieldConfigurationConfig(config),
  appleTeamId: "AX3C2B78YD",
  bundleIdentifier: bundleIdentifier("shield", "com.johansardar.excerlock.shield"),
  deploymentTarget: "17.4",
});
