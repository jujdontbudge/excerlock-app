# Native Apple targets (T01)

Source inputs for `react-native-device-activity@0.6.1`'s shipped
`@kingstinct/expo-apple-targets` plugin, plus the pinned repository patch
`patches/@kingstinct+expo-apple-targets+0.1.19.patch` which adds the missing
`device-activity-report` target type (installed 0.1.19 exposes only
monitor/shield-action/shield-configuration). Expo prebuild links them into the
generated Xcode project; nothing under `app-next/ios` is hand-maintained.

Required (generated as Xcode appex on every clean prebuild):

- `DeviceActivityMonitorExtension` (`com.johansardar.excerlock.monitor`)
- `ShieldConfiguration` (`com.johansardar.excerlock.shield`)
- `ShieldAction` (`com.johansardar.excerlock.shieldaction`, + ManagedSettings/UserNotifications)
- `DeviceActivityReportExtension` (`com.johansardar.excerlock.report`,
  ExtensionKit `com.apple.deviceactivityui.report-extension`, display-only)

Ordinary builds keep the canonical app group `group.com.johansardar.excerlock`.
The explicit local Linked Recorder research mode instead gives the app and all
four extensions `group.com.johansardar.excerlock.lab.linkedtrace`, preventing a
co-installed lab build from mutating production policy or selection state. Both
modes keep the Family Controls entitlement, team `AX3C2B78YD` and iOS 17.4 target.
The finalized validator materializes the monitor class and shared runtime
byte-for-byte from the installed package; those `*.generated.swift` files are
ignored (see `.gitignore` pattern below). The App Intent lives in the MAIN app
target (`app-intents/OpenExcerLockIntent.swift` via `plugins/withMainAppIntent.js`);
there is no fifth appex.
