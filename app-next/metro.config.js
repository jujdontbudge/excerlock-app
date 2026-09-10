const { getDefaultConfig } = require('expo/metro-config');
const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const config = getDefaultConfig(__dirname);
// Captures are development output, never modules. Otherwise saving evidence can
// trigger an HMR refresh banner in the very recording being captured.
const defaults = config.resolver.blockList ? [].concat(config.resolver.blockList) : [];
const blockList = [...defaults, /[/\\]app-next[/\\](evidence|build|coverage|dist)[/\\].*/];
const sentryConfig = getSentryExpoConfig(__dirname);
sentryConfig.resolver.blockList = blockList;
module.exports = sentryConfig;
