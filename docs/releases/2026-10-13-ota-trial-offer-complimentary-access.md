# OTA b4906c47 — three-day trial copy, onboarding offer B, complimentary access — 2026-10-13

- Source on `main`: `b4906c47` (merge of `trial-test` `0d6841dc`, `free-access` `4c4e03c8`, the `LocalAccessHarness` `updateProfile` stub, and `excer ota --runtime`). `./excer check` 22/22; CI run `38465762399` succeeded.
- Runtime 5 (build 18): update group `de782c24-e5b3-468a-b27f-771d2049fce9`, ship gate on the build 18 Debug binary. Tag `ota-runtime5-20261013-b4906c47`.
- Runtime 4 (build 17): update group `07a78440-6bf5-4300-b3bb-66f30d30550a`, ship gate on a runtime 4 Debug binary built from `723ae15c`, the source of the previously live runtime 4 update. Tag `ota-runtime4-20261013-b4906c47`.
- Combined-code proofs before publishing, on build 18: launch `account-bound-proof-matches`, `wrong-account-proof-fails-closed`, `wrong-environment-proof-fails-closed`, `unavailable-proof-fails-closed`, `returning-unpaid-to-paywall`; paywall `identity-purchase-to-setup`, `offer-a-checkout-selects-trial-product`, `offer-b-checkout-selects-monthly-twin`, `trial-switch`. On the runtime 4 binary: the three ship proofs, `wrong-account-proof-fails-closed`, `returning-unpaid-to-paywall`, both offer checkouts, `trial-switch`, `onboarding/offer-b-complete-onboarding`, `walking-state-home`, `treadmill-stop-relocks`.
- `paywall/restore-wrong-store-account-stays-unpaid` fails identically on unmodified `main` (`No purchase found` never appears); it predates this release.

## Server deploy

`deploy/deploy.sh` from `555b6b33` (server code as in `b4906c47`), dry run first. Migration `0011_complimentary-access` (two new tables, no destructive statements) applied; 14 journal entries. Local and public `/v1/health` and `/v1/ready` 200 for Production and TestFlight; unauthenticated `POST /v1/subscription/resync` 401. `./excer access` with `--prod` needed the project ID `excerlock` instead of the project number; after that fix a Sandbox-lane grant, list and revoke on `grant-smoke-test@example.com` round-tripped (grant `febff645`).

## Trial versus no-trial split (`dc74f7aa`)

ADR 0079 replaces the Adapty A/B test with a 50/50 install split. B installs load `onboarding_no_trial` → paywall B `a2d11553` (annual and monthly `.notrial`); agents stop or resume B with `adapty placements update` (`docs/subscriptions.md`). Published to runtime 5 (group `4effceb9-9012-49ae-8f23-445746729305`) and runtime 4 (group `2470ffda-b87e-4326-978c-618e9f238764`) after green CI, each through `./excer ota` with the ship gate on an installed build of that runtime.

- Proofs on build 18: onboarding `offer-a-three-days`, `offer-b-no-trial` (asserts the `onboarding_no_trial` placement), `offer-b-killed-shows-a`, `offer-a-intro-ineligible`, `offer-unknown-falls-back`, `offer-late-falls-back`, `offer-error-falls-back`, `offer-malformed-falls-back`. On the runtime 4 binary: `offer-b-no-trial`, `offer-a-three-days`, `offer-b-killed-shows-a`, `offer-error-falls-back`.
- App Store Connect: both launch plans carry a three-day free trial in all 175 territories.
- Not verified: a real Sandbox purchase on either arm; the proofs use the scripted Adapty SDK.

## Limits

The runtime 4 test binary is not the signed build 17. Since build 17 (`1508e366`), runtime 4 gained `@react-native-masked-view/masked-view` (used by the paywall `HotWord`, live on runtime 4 since update `c7030f26`) and an optional `excerlock-store-environment` function. This release adds no native requirement beyond the previously live runtime 4 update; whether the masked headline renders on the signed build 17 is unverified.
