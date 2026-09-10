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
