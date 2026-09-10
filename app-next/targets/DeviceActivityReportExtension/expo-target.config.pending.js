// PENDING (T01): DeviceActivityReport target definition. Bundle
// `com.johansardar.excerlock.report` exists in ASC with Family Controls
// approval, but `react-native-device-activity@0.6.1` exposes no
// `device-activity-report` target type via
// `@kingstinct/expo-apple-targets@0.1.19`, so this config intentionally does
// not generate an Xcode appex yet. The validator asserts this file exists as
// the preserved capability; signing/verification of the report appex stays
// unchecked until tooling supports the
// `com.apple.deviceactivity.report-extension` point without fabrication.
module.exports = () => {
  throw new Error(
    "DeviceActivityReportExtension is pending: no device-activity-report target type in the installed RNDA/apple-targets. See targets/DeviceActivityReportExtension/README.md",
  );
};
