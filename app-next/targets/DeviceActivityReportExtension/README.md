# DeviceActivityReportExtension (required)

Bundle `com.johansardar.excerlock.report`. Display-only DeviceActivityReport
(`com.apple.deviceactivityui.report-extension`, ExtensionKit product type);
cannot share data back into the main app ledger.

Sources mirror the installed Xcode 26 Device Activity Report template
(`DeviceActivityReportExtension.swift`, `TotalActivityReport.swift`,
`TotalActivityView.swift`): `import DeviceActivity + ExtensionKit + SwiftUI`,
`@main struct …: DeviceActivityReportExtension`, scene context/content plus
async `makeConfiguration`. The `device-activity-report` target type is supplied
by the pinned repository patch
`patches/@kingstinct+expo-apple-targets+0.1.19.patch` (installed
`@kingstinct/expo-apple-targets@0.1.19` exposes only monitor/shield-action/
shield-configuration). The validator asserts this target as required.
