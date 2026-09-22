# TestFlight 1.0.0 (10) — 2026-09-22

Runtime-3 baseline for the captain's two-phase OTA delivery proof. The app tree
includes the accepted Issue #145 UI, the annual-subscription promotional-image
repair record, and `9168c6c5`, which removes the rejected onboarding rating
warm-up and routes S3c directly to T1. This release is TestFlight-only: do not
attach it to the App Store version or submit it for App Review.

## Candidate identity

- Exact archived source: `a8225ea2b1ee671f8279db47dccf138d91841f2c`.
- App `6787265352`; bundle `com.johansardar.excerlock`; team `AX3C2B78YD`.
- Marketing version `1.0.0`; build `10`; runtime `3`; update channel
  `production`; build environment `production` (`EXCERLOCK_ENV=prod`).
- `asc builds next-build-number` observed processed/upload build `9` and resolved
  `10` as the next safe build number.

## Bounded verification

The accepted rating-removal commit records 72 focused Jest tests plus 45
onboarding-harness tests passing. Changed-scope checks also passed: config smoke
9/9, signed-manifest fixtures 10/10, linked-recorder boundary 8/8, app-next
TypeScript, app-next lint with no errors, and the two corrected condition-demo
component tests.

The release-style simulator flow `20260922T232507Z/E2E-RATING-REMOVAL` passed on
the exact source commit: S3c rendered, **Next** advanced directly to T1's **Try
ExcerLock free**, the rejected rating copy/controls were absent before and after,
and screenshots plus accessibility trees were retained locally.

## Apple artifact

- Archive: `app-next/build/tf/ExcerLock-1.0.0-10.xcarchive`.
- IPA: `app-next/build/tf/ExcerLock-1.0.0-10.ipa`, SHA-256
  `9839e2ba4fa1608a81c7f5eb564cbe8687c6618f1e0a066b29eaa1183f42114d`.
- Apple build ID `56eb4180-c65f-4d04-afca-593f26db1f8c`; uploaded
  `2026-09-22T16:34:35-07:00`; processing `VALID`; audience
  `APP_STORE_ELIGIBLE`; `usesNonExemptEncryption: false`.
- The exported IPA reports `1.0.0 (10)`, runtime `3`, and channel `production`.
  `verify-binary.sh --distribution` passed for the main app and all four
  extensions, including exact Family Controls/App Group signature and profile
  authorization checks on all five executables. Export reused the five active
  Build 9 App Store profiles.
- Internal group `4f17dfa8-c80e-4a0f-905a-a6d0d9a6c424` has all-build access and
  is reported for Build 10. Apple rejects redundant explicit assignment to that
  group, so tester `johansardar@icloud.com`
  (`5e83c452-5ef3-46c9-af67-ea59e50c22d5`) was attached directly and is the one
  tester returned for the build.
- What to Test localization `87c0c4e9-5378-4a7f-83f0-23d344bcb4c0` describes
  the baseline launch and direct onboarding transition.
- Build 10 was not attached to the App Store version and was not submitted for
  review. The existing rejected App Store version remains attached to build 9.
