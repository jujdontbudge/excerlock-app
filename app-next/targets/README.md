# Native Apple targets (T01)

Source inputs for `react-native-device-activity@0.6.1`'s shipped
`@kingstinct/expo-apple-targets` plugin. Expo prebuild links them into the
generated Xcode project; nothing under `app-next/ios` is hand-maintained.

Required (generated as Xcode appex on every clean prebuild):

- `DeviceActivityMonitorExtension` (`com.johansardar.excerlock.monitor`)
- `ShieldConfiguration` (`com.johansardar.excerlock.shield`)
- `ShieldAction` (`com.johansardar.excerlock.shieldaction`, + ManagedSettings/UserNotifications)

All three keep the canonical app group `group.com.johansardar.excerlock`,
Family Controls entitlement, team `AX3C2B78YD` and iOS 17.4 deployment target.
The finalized validator materializes the monitor class and shared runtime
byte-for-byte from the installed package; those `*.generated.swift` files are
ignored (see `.gitignore` pattern below).

Pending (preserved as definitions, no Xcode appex in T01):

- `DeviceActivityReportExtension` (`com.johansardar.excerlock.report`,
  display-only, Family Controls approval held, tooling has no report type)
- `app-intents` (empty intent, must not inherit Family Controls, Astra review pending)

Pending definitions live as `expo-target.config.pending.js` + stub Swift +
`Info.plist` so `withTargetsDir` ignores them. Promoting either means renaming
to `expo-target.config.js` and extending the validator from pending to required.
