// PENDING (T01): App Intents target definition. Empty intent, no Family
// Controls. Preserved without generating an Xcode appex until Astra's fifth-
// target review resolves the extension detail (arch file absent 2026-09-10).
// The validator asserts this file exists; binary verification reports the
// App Intents appex as unchecked and never asserts Family Controls on it.
module.exports = (config) => ({
  type: "app-intent",
  name: "AppIntentsExtension",
  bundleIdentifier: "com.johansardar.excerlock.appintents",
  appleTeamId: "AX3C2B78YD",
  deploymentTarget: "17.4",
  entitlements: {
    "com.apple.security.application-groups": [
      "group.com.johansardar.excerlock",
    ],
  },
});
