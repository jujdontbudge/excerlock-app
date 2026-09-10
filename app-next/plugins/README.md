# Local Expo config plugins (T01 native manifest)

B50 keeps push: `withNoPush` is deleted and must stay absent. `expo-notifications`
injects `aps-environment`; the provisioning profile must carry Push or the build
fails to sign — that failure is the honest signal, not a stripped entitlement.

`withScreenTimeExtensionValidation` is first-listed so it runs LAST (LIFO):
it materializes the package-owned monitor Swift sources from the installed
`react-native-device-activity@0.6.1`, then fails clean prebuild if the monitor,
shield configuration or shield action target loses its canonical bundle ID,
iOS 17.4 deployment target, team `AX3C2B78YD` or `*generated.entitlements` file.
It also asserts the two pending definitions (`DeviceActivityReportExtension`,
`app-intents`) exist as `expo-target.config.pending.js` without generating
invalid Xcode appex.

`withMainAppEntitlements` asserts every app-target build configuration's
`CODE_SIGN_ENTITLEMENTS` points at `ios/ExcerLock/ExcerLock.entitlements`.
A stale or `undefined.entitlements` reference ships an executable without its
capabilities; prebuild fails instead.

`withHealthKitBackgroundBootstrap` keeps the HealthKit background-delivery
entitlement and cold-launch observer setup while isolating Nitro's C++ headers
in an Objective-C++ bridge. The upstream HealthKit plugin remains responsible
for usage descriptions and the base HealthKit entitlement, but its direct
Swift AppDelegate import is disabled (`background: false` + local patch)
because that import cannot compile in the Expo application target.

## Invariants

All plugins are deterministic build transformations. No local plugin may add
remote-push capability beyond what `expo-notifications` provides, silently
repair an incorrect extension identity, or set a usage string that another
plugin already owns (each `NS*UsageDescription` lives in exactly one plugin).
