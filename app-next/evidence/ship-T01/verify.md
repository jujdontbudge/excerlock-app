# Binary verification evidence

`scripts/verify-binary.sh --prebuild-only ios` → all PASS:

```
VERIFY PASS: prebuild outputs present in ios
VERIFY PASS: Info.plist keys present once with location/fetch/processing
VERIFY PASS: PrivacyInfo.xcprivacy non-empty
Prebuild-only verification complete (binary steps need an IPA Payload dir).
```

Checked (actual generated plists/project, never config source alone):

- Main `ExcerLock.entitlements`: all 7 §1 families + group value + applinks.
- Each required appex `generated.entitlements`: exactly Family Controls + App Groups; no HealthKit/SignIn/push/associated-domains.
- `project.pbxproj`: 3 appex targets with canonical bundles, `DEVELOPMENT_TEAM = AX3C2B78YD`, `*generated.entitlements` refs; no `ActivityMonitorExtension` pollution; no report/appintents targets (pending by design).
- `Info.plist`: 9 usage strings + alternate icons + localizations, each exactly once; `UIBackgroundModes [location, fetch, processing]`.
- `PrivacyInfo.xcprivacy`: 6 collected types (ProductInteraction, CrashData, PerformanceData, DeviceID, PurchaseHistory, UserID; all Tracking=false) + 4 required-reason APIs.
- HealthKit `@_silgen_name` bridge + `.mm` present in generated app target.

UNCHECKED (explicitly, per constraints — no EAS build/upload, no simulator, no device):

- `eas build -p ios --profile preview` signing + `verify-binary.sh <PayloadDir>` codesign/provisioning truth (steps 2, 5).
- Dev-client launch on simulator + harness boot + module presence (acceptance row 3).
- Physical-device acceptance for every detector (T00 gates stand).
- Report + App Intents appex (pending definitions, no valid tooling target yet).

No signed IPA or device acceptance is claimed: there is no artifact.

## Root structured signed-manifest correction (2026-09-10)

The initial shell verifier checked key names and only decoded profiles, allowing false capability values,
wrong groups/IDs and mismatched profiles to pass. A mandatory structured Python verifier now precedes
those smoke checks: codesign strict validity, exact five bundle IDs/extension points/embedding paths,
required entitlement VALUES (including booleans/group IDs), no unexpected/main-only extension privileges,
team/application-prefix binding, unexpired profile authorization for every signed entitlement, build/version
coherence, signed-payload usage/privacy declarations, and deep signature verification. Debug/production
push modes must match provisioning. Release workflow must still additionally require distribution signing.

Eight pure regression tests pass; bad capability/profile/group/team/expiry/privilege/push/debug and payload
Info.plist fixtures are rejected. No signed IPA available: this is verifier regression proof only, NOT an
accepted archive or device Family Controls activation. Existing --prebuild-only continues to report only
prebuild evidence. Privacy labeling/content correctness and App Store approval remain T13 gates.
