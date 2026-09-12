const {
  createConfig,
} = require("react-native-device-activity/config-plugin/createExpoTargetConfig");

const createShieldActionConfig = createConfig("shield-action");
const { bundleIdentifier } = require("../../plugins/linkedRecorderResearchConfig");

module.exports = (config) => ({
  ...createShieldActionConfig(config),
  appleTeamId: "AX3C2B78YD",
  bundleIdentifier: bundleIdentifier("shieldaction"),
  deploymentTarget: "17.4",
  frameworks: ["ManagedSettings", "UserNotifications"],
});
