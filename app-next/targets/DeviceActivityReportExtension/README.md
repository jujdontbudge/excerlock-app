# DeviceActivityReportExtension (pending)

Bundle `com.johansardar.excerlock.report`. Display-only DeviceActivityReport
(`com.apple.deviceactivity.report-extension`); cannot share data back.

Status: pending. ASC bundle exists; Family Controls approval held with the
other three Screen Time bundles. No Xcode target is generated in T01 because
the installed `react-native-device-activity@0.6.1` /
`@kingstinct/expo-apple-targets@0.1.19` expose only `device-activity-monitor`,
`shield-action` and `shield-configuration` — fabricating a report appex from a
wrong type would sign an invalid extension. The validator asserts this
definition exists; `scripts/verify-binary.sh` explicitly reports the report
appex as unchecked.
