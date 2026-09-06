const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
// Captures are development output, never modules. Otherwise saving evidence can
// trigger an HMR refresh banner in the very recording being captured.
const defaults = config.resolver.blockList ? [].concat(config.resolver.blockList) : [];
config.resolver.blockList = [...defaults, /[/\\]app-next[/\\](evidence|build|coverage|dist)[/\\].*/];
module.exports = config;
