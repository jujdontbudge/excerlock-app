# TestFlight 1.0.0 (13) — 2026-09-28

TestFlight-only payment investigation build. Not attached to the rejected App Store version or submitted for App Review. No screenshot metadata was uploaded, and no OTA was published.

- Exact app source: local `main` commit `eda4aaa9cf55e82b0f73095be688967c4e0c5143` (merge `d9a53857` of the App Review paywall/identity fix branch plus build number 13). Not pushed.
- App `6787265352`; bundle `com.johansardar.excerlock`; version `1.0.0 (13)`, runtime `4`, `EXCERLOCK_ENV=prod`; Apple build `b1821311-7d95-46e7-961f-3fee082c7695`, processing `VALID`.
- Internal TestFlight group `4f17dfa8-c80e-4a0f-905a-a6d0d9a6c424` has all-build access and contains the owner's tester account. What to Test notes ask for sandbox purchase, cancellation, Restore purchases, and retry after transient connection failure.
- `./excer check`: 20/20 on the isolated clean source checkout. Focused identity-lab paywall proofs already passed in `app-review-actual-proof/.excer/proof/paywall/2026-09-29_01-43-10` through `2026-09-29_01-47-35`; regular paywall paths passed there at `2026-09-29_01-48-32`, `_01-48-57`, and `_01-49-46`. These are scripted simulator edges, **not a real StoreKit sandbox purchase**.
- Distribution verifier passed for main app and four Screen Time extensions, with matching `1.0.0 (13)` versions, production provisioning/entitlements and no HealthKit. Physical-device activation and payments remain unverified until the owner's TestFlight run.
- IPA SHA-256: `34852743f4bf3f5421b5c0d286921576e44cec9f06ce519b9693ce9a886913aa`. Archive, IPA and command logs: `/tmp/excerlock-tf13-source/app-next/build/tf/` and `/tmp/excerlock-tf13-evidence/` on this Mac.
- The separate Shield/screenshot worker's uncommitted Store mockups were not merged; they do not change the app binary and are not verified App Store screenshots.
