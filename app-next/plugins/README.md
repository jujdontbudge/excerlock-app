# Local Expo config plugins (T01 native manifest)

B50 keeps push: `withNoPush` is deleted and must stay absent. `expo-notifications`
supplies the `aps-environment` default at prebuild and signing/EAS supplies the
release value; our config never hardcodes `development` (that would mislabel a
release binary). The provisioning profile must carry Push or the build fails to
sign — that failure is the honest signal, not a stripped entitlement.

`withScreenTimeExtensionValidation` is first-listed by convention (both it and
`withMainAppEntitlements` use `withFinalizedMod` postconditions, so neither
relies on list position for ordering): it materializes the package-owned
monitor Swift sources from the installed `react-native-device-activity@0.6.1`,
then fails clean prebuild unless exactly main+4 appex exist (monitor, shield
configuration, shield action, report) with canonical bundle IDs, iOS 17.4
deployment target, team `AX3C2B78YD` and `*generated.entitlements` files
carrying Family Controls + App Groups without main-only capabilities.
Signing-generated entries (application-identifier, team, keychain groups,
get-task-allow) are always permitted.

`withMainAppEntitlements` asserts every app-target build configuration's
`CODE_SIGN_ENTITLEMENTS` points at `ios/ExcerLock/ExcerLock.entitlements`.
A stale or `undefined.entitlements` reference ships an executable without its
capabilities; prebuild fails instead.

`withMainAppIntent` links `app-intents/OpenExcerLockIntent.swift` (minimal
`openAppWhenRun` intent, no Family Controls, no Siri entitlement) into the
MAIN app target with explicit `AppIntents.framework` membership, idempotently.

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
