const { withInfoPlist } = require('expo/config-plugins');
const { appGroupIdentifier } = require('../../plugins/linkedRecorderResearchConfig');

module.exports = (config) => withInfoPlist(config, (next) => {
  next.modResults.EXCERLOCK_ENFORCEMENT_APP_GROUP = appGroupIdentifier();
  return next;
});
