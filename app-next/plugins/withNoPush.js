const { withEntitlementsPlist } = require('expo/config-plugins');

/**
 * B14: no push infrastructure. Config plugins apply in LIFO order, so this one stays FIRST in
 * app.json to run last and strip any `aps-environment` entitlement another plugin added.
 * @param {import('expo/config').ExpoConfig} config
 */
function withNoPush(config) {
  return withEntitlementsPlist(config, (modConfig) => {
    delete modConfig.modResults['aps-environment'];
    return modConfig;
  });
}

module.exports = withNoPush;
