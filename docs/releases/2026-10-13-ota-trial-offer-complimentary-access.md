# OTA b4906c47 — three-day trial copy, onboarding offer B, complimentary access — 2026-10-13

- Source on `main`: `b4906c47` (merge of `trial-test` `0d6841dc`, `free-access` `4c4e03c8`, the `LocalAccessHarness` `updateProfile` stub, and `excer ota --runtime`). `./excer check` 22/22; CI run `38465762399` succeeded.
- Runtime 5 (build 18): update group `de782c24-e5b3-468a-b27f-771d2049fce9`, ship gate on the build 18 Debug binary. Tag `ota-runtime5-20261013-b4906c47`.
- Runtime 4 (build 17): update group `07a78440-6bf5-4300-b3bb-66f30d30550a`, ship gate on a runtime 4 Debug binary built from `723ae15c`, the source of the previously live runtime 4 update. Tag `ota-runtime4-20261013-b4906c47`.
- Combined-code proofs before publishing, on build 18: launch `account-bound-proof-matches`, `wrong-account-proof-fails-closed`, `wrong-environment-proof-fails-closed`, `unavailable-proof-fails-closed`, `returning-unpaid-to-paywall`; paywall `identity-purchase-to-setup`, `offer-a-checkout-selects-trial-product`, `offer-b-checkout-selects-monthly-twin`, `trial-switch`. On the runtime 4 binary: the three ship proofs, `wrong-account-proof-fails-closed`, `returning-unpaid-to-paywall`, both offer checkouts, `trial-switch`, `onboarding/offer-b-complete-onboarding`, `walking-state-home`, `treadmill-stop-relocks`.
- `paywall/restore-wrong-store-account-stays-unpaid` fails identically on unmodified `main` (`No purchase found` never appears); it predates this release.

## Not yet done

- Server: migration `0011_complimentary-access` and the grant-aware resync are on `main` but not deployed; until then no complimentary grant applies.
- App Store Connect: launch plans still carry the one-week trial; the client reads the trial length from the store offer.
- Adapty: no paywall B, audience or A/B test yet; every user gets arm A.

## Limits

The runtime 4 test binary is not the signed build 17. Since build 17 (`1508e366`), runtime 4 gained `@react-native-masked-view/masked-view` (used by the paywall `HotWord`, live on runtime 4 since update `c7030f26`) and an optional `excerlock-store-environment` function. This release adds no native requirement beyond the previously live runtime 4 update; whether the masked headline renders on the signed build 17 is unverified.
