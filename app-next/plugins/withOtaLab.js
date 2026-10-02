const { withFinalizedMod } = require('expo/config-plugins');
const { readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

module.exports = function withOtaLab(config) {
  return withFinalizedMod(config, ['ios', (mod) => {
    const file = join(mod.modRequest.platformProjectRoot, 'Podfile');
    const source = readFileSync(file, 'utf8');
    const call = "use_expo_modules!({ exclude: ['expo-dev-client', 'expo-dev-launcher', 'expo-dev-menu'] })";
    const patched = source.replace(/(^|[^\w])use_expo_modules!(?![({])/, `$1${call}`);
    if (patched === source && !source.includes(call)) throw new Error('OTA lab could not remove the development launcher');
    writeFileSync(file, patched);
    return mod;
  }]);
};
