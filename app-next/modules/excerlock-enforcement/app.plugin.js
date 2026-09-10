const { withInfoPlist } = require('expo/config-plugins');
const APP_GROUP = 'group.com.johansardar.excerlock';
module.exports = (config) => withInfoPlist(config, (next) => {
  next.modResults.EXCERLOCK_ENFORCEMENT_APP_GROUP = APP_GROUP;
  return next;
});
