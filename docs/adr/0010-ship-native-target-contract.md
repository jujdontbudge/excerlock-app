---
status: accepted
date: 2026-09-10
---

# 0010: Ship native target and signing contract

## Decision

Generate one application and four Screen Time app extensions: monitor, shield configuration,
shield action, and report. Compile a minimal Open ExcerLock AppIntent into the main application.
No additional App Intents extension or identifier is required.

Use the installed `@kingstinct/expo-apple-targets` generator through `react-native-device-activity`.
Preserve app-owned extension sources (`copyToTargetFolder: false`). Add reproducible, narrowly scoped
report-target support because this pinned generator does not accept `device-activity-report`.
Validate final generated Xcode postconditions with `withFinalizedMod`, not assumptions of global LIFO.

## Context

The ship manifest required five approved identifiers but separately requested a fifth appex. Apple
supports AppIntent implementations in an app target; a sixth executable is unnecessary. The existing
three extension implementations must not be overwritten by dependency templates. The report needs a
real DeviceActivityReportExtension, host dependency, embedded product, and resources.

The executable signature is authoritative. All four Screen Time extensions need Family Controls and
the shared App Group. Main-only capabilities must not be demanded on extensions. Signed executables
also contain provisioning-generated identifiers, team/keychain groups and get-task-allow; an exact
"two entitlements and nothing else" assertion is invalid. Push environment follows provisioning.

## Consequences

Preserves the five approved identifiers while providing App Intents. Native compilation, signing,
Siri discovery, Screen Time behavior and privacy manifests remain verification gates, not inferred
from configuration. Shared-group defaults use reason 1C8F.1; dependencies retain their own manifests.
Tracking and collected-data declarations must match final transmitted data, not installed capabilities.
This corrects contradictory ship implementation requirements; it does not relax product behavior.

## References

- [Apple AppIntent](https://developer.apple.com/documentation/appintents/appintent), current official API.
- [Expo SDK 57 app config](https://docs.expo.dev/versions/v57.0.0/config/app/), installed SDK.
- `plans/ship/02-native-manifest.md`, `plans/ship/T01-native-manifest-and-engine-port.md` (corrected).
- `app/plugins/withScreenTimeTargetValidation.js` and installed generator source (existing basis).
