/**
 * Reserved first-pass config plugin for the push-capability removal required by the native target set.
 * Phase 0 keeps the ordering seam executable; the native mutation arrives with those targets.
 *
 * @param {import("expo/config").ExpoConfig} config
 */
function withNoPush(config) {
  return config;
}

module.exports = withNoPush;
