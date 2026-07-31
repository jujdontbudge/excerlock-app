const { withEntitlementsPlist } = require("expo/config-plugins");

/** @param {import("expo/config").ExpoConfig} config */
function withNoPush(config) {
  return withEntitlementsPlist(config, (modConfig) => {
    delete modConfig.modResults["aps-environment"];
    return modConfig;
  });
}

module.exports = withNoPush;
