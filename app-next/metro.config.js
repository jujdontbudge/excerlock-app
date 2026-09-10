const { getDefaultConfig } = require('expo/metro-config');
const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const config = getDefaultConfig(__dirname);
// Captures are development output, never modules. Otherwise saving evidence can
// trigger an HMR refresh banner in the very recording being captured.
const defaults = config.resolver.blockList ? [].concat(config.resolver.blockList) : [];
const blockList = [...defaults, /[/\\]app-next[/\\](evidence|build|coverage|dist)[/\\].*/];
// Dev routes must not enter preview/production route contexts or bundles.
// NODE_ENV covers local release exports; EXCERLOCK_ENV also covers dev-server previews.
if (process.env.NODE_ENV === 'production' || ['preview', 'prod'].includes(process.env.EXCERLOCK_ENV)) {
  blockList.push(/[/\\]app-next[/\\]app[/\\]dev\.tsx$/, /[/\\]app-next[/\\]src[/\\]features[/\\]dev[/\\].*/);
}
// This native app does not collect browser replay. Keep native crash reporting
// and Sentry debug IDs while excluding the SDK's unused web replay graph.
const sentryConfig = getSentryExpoConfig(__dirname, { includeWebReplay: false });
sentryConfig.resolver.blockList = blockList;
module.exports = sentryConfig;
