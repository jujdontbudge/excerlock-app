# TestFlight 1.0.0 (14) — explicit launch sign-in

- Uploaded September 28, 2026, for internal device testing only. Not attached to an App Store version or submitted for review. No push or OTA publication.
- Signed binary source: `4f81792bfd8283258330394d77e677b8f187ea29` (`7ec33657` is the explicit-sign-in fix; the subsequent commit sets build number 14). The release checkout at `/tmp/excerlock-tf14-source` had no unrelated dirty Analytics/UI files.
- Apple build ID: `14a020e1-2063-41ae-9685-9930db1540eb`, processing state `VALID`; app `6787265352`; version `1.0.0 (14)`; runtime `4`; environment `prod`.
- IPA SHA-256: `6895a3edda65de914a51e108f86f19e89f602639394f522d9dcd3aca735157ee`.
- Internal TestFlight group `4f17dfa8-c80e-4a0f-905a-a6d0d9a6c424` has all-build access and contains the owner tester account. Build-specific What to Test notes verified after upload.
- The signed IPA's `Expo.plist` points to production channel/runtime 4. At upload, that channel mapped to the production branch, which had **zero iOS runtime-4 OTA updates**; no older OTA should supersede the embedded sign-in fix on first launch. See `ota-channel.json` and `ota-runtime4.json` in the evidence directory. This is a server metadata check, not a device launch observation.

## Verification

- Exactly one `./excer check` on the clean release source: 20/20. Log: `/tmp/excerlock-tf14-evidence/excer-check.log`.
- Signed distribution manifest verified for the main app and four Screen Time extensions; exact entitlements/profiles/signatures, no HealthKit or Linked Recorder; all bundles version 14. Log: `/tmp/excerlock-tf14-evidence/distribution-verification.log`.
- Simulator focused proofs on the included `7ec33657` fix: `setup/returning-session-blocked` and `setup/returning-session-signed-in` at `.excer/proof/setup/2026-09-29_03-13-16/` and `.excer/proof/setup/2026-09-29_03-13-34/`; deep-linked Account and Paywall blocked at `.excer/proof/setup/2026-09-29_03-14-12/` and `.excer/proof/setup/2026-09-29_03-15-17/`; cold-relaunch screenshot `.excer/proof/setup/returning-cold-relaunch.png`; canceled fake provider screenshot `.excer/proof/setup/returning-cancel-blocked.png`; post-Paywall mandatory sign-in at `.excer/proof/paywall/2026-09-29_03-10-44/`.
- App Store Connect API build/group/notes readback: `/tmp/excerlock-tf14-evidence/` (`build-info.json`, `build-groups.json`, `test-notes-readback.json`).

## Limits and required owner test

- No physical-device launch, real Apple/Google/email-code reauthentication, account-mismatch recovery, or StoreKit sandbox purchase/cancel/restore was observed by the agent. The signed-manifest verifier explicitly cannot prove device activation or Screen Time behavior.
- On TestFlight build 14, force quit after signing in and relaunch: it must show sign-in before Home or Settings. Cancel, then confirm access remains blocked. Sign in with the same account to enter. Afterward try sandbox purchase and Restore purchases and report any error. Build 13 remains available in TestFlight and does **not** contain this fix; select build 14.
