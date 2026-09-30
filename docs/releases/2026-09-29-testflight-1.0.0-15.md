# TestFlight 1.0.0 (15) — internal hard-Paywall diagnostic

- Uploaded September 29, 2026 under the release lock, **internal TestFlight only**. No App Review submission, public release, OTA, push, merge, production data change, dashboard mutation, or server deployment.
- This is a one-off **WIP-source exception** requested for immediate device testing. It does not satisfy ADR 0025's `main`-source release rule and must not be treated as an integrated release candidate. The branch `JohanSardar/hard-paywall-testflight-15` was made in an isolated local clone from WIP `5738361200054c9c50a5bef361f6c444a6fdf3f0` and contains only the build-number change for the signed source commit `b7c1bf69414be8942818369a64cc0d98ccdd24ed`.
- Apple build ID: `c2e3e1e6-aa25-4f40-8a3f-bc515a191299`; version `1.0.0 (15)`; processing state `VALID`; app `6787265352`.
- IPA SHA-256: `30029182c3258bf31badb5c50382cdc8acdcf70b2a96ba4b749f388786098c56`.
- The Internal TestFlight group has all-build access. Build-specific English What to Test notes warn that paid Home admission may remain blocked.
- Embedded channel `production`, native runtime `4`. At upload, `production` had zero iOS runtime-4 OTA updates; the embedded JS should be used. This is a metadata check, not device observation.

## Verification

- `./excer check` passed 20/20 on the exact signed source commit: `/tmp/excerlock-tf15-evidence/excer-check.log`.
- Signed binary verifier passed for the main app and four Screen Time extensions, including provisioning, entitlements, signatures, Hermes artifact, privacy manifest, and versions: `/tmp/excerlock-tf15-evidence/distribution-verification.log`.
- ASC build/group/test-note readbacks: `/tmp/excerlock-tf15-evidence/` (`build-info.json`, `build-groups.json`, `test-notes-readback.json`). Source, hash and upload receipt are recorded there.
- First export failed because Xcode's `/usr/bin/rsync` launched a different `rsync` from the inherited path. The retry used Apple's `rsync` on both sides and exported the same archive successfully. Both logs are retained.

## Limits: not a fixed app

- The isolated TestFlight Sandbox server/environment has **not** been deployed. This binary uses the production API/channel, while TestFlight StoreKit purchases use Apple's sandbox. Account-bound authorization will fail closed for sandbox receipts even after a successful purchase. Test purchase/cancel/restore UI can be observed, but Home admission and account-ownership transfer cannot be accepted as working from this build.
- No real provider, StoreKit, two-phone, Screen Time, webhook/transfer, or physical-device acceptance was observed before upload. Simulator fixtures are not payment evidence. Do not send this build to App Review or call the hard Paywall fixed.
- When a signed-in test account cannot enter Home after purchase, record the exact time, selected account (by opaque test identifier, not personal data), and purchase/restore outcome without logging private health/Screen Time details. Do not purchase twice to work around an unknown authorization state.
