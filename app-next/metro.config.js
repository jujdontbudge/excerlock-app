const { getSentryExpoConfig } = require('@sentry/react-native/metro');
// Sentry's wrapper around expo/metro-config: it adds the debug-id and source-map plumbing a
// readable production stack trace needs. Web replay is off, so its bundle stays out.
const config = getSentryExpoConfig(__dirname, { includeWebReplay: false });
// Captures are development output, never modules. Otherwise saving evidence can
// trigger an HMR refresh banner in the very recording being captured.
const defaults = config.resolver.blockList ? [].concat(config.resolver.blockList) : [];
config.resolver.blockList = [...defaults, /[/\\]app-next[/\\](evidence|build|coverage|dist)[/\\].*/];
module.exports = config;
