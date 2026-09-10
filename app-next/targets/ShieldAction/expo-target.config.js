const {
  createConfig,
} = require("react-native-device-activity/config-plugin/createExpoTargetConfig");

const createShieldActionConfig = createConfig("shield-action");

module.exports = (config) => ({
  ...createShieldActionConfig(config),
  appleTeamId: "AX3C2B78YD",
  bundleIdentifier: "com.johansardar.excerlock.shieldaction",
  deploymentTarget: "17.4",
  frameworks: ["ManagedSettings", "UserNotifications"],
});
