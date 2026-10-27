# Payments and auth rebuild — 2026-10-27

Owner-requested: ship the payments and auth rebuild (`docs/plans/payments-auth-rebuild/`) and release 1.0.2.

## Source

`main` at `8af1f122`, a fast-forward of `rebuild/payments-auth` onto `d330842d`. CI passed (run 40537077394).

## Server

`deploy/deploy.sh` from `8af1f122`, after a dry run. No new migrations. Adds `GET /v1/subscription/complimentary` and one JSON log line per request and per Adapty webhook; `POST /v1/subscription/resync` is unchanged for runtimes 4–7. `/v1/health` and `/v1/ready` pass locally and at `https://api.excerlock.com` (Production and `/testflight`); the complimentary route answers 401 without a token.

## OTA — runtime 8 only (1.0.2 build 24)

Group `1a45a512-ec92-4429-8dcb-62ef30024497`, update `01a17e27-554d-7b4c-a482-c0d0e3e8358f`, tag `ota-runtime8-20261027-8af1f122`. Runtimes 4–7 get no backport (plan decision D6). `./excer ota` ship gate passed on worker simulator `ExcerLock-payauth` (runtime 8): 23 checks, `public-config-secrets`, `release-bundle`, `launch/first-launch-welcome`, `launch/subscriber-opens-home`, `launch/every-tab-opens`.

A fresh simulator without a set location fails `fresh-install` scenario loading after a signed-in scenario (a rejected `getCurrentPositionAsync`); set one with `xcrun simctl location <udid> set <lat,lon>` before the gate.

## App Store

Version `90b9ce56` 1.0.2 (build 24) released from `PENDING_DEVELOPER_RELEASE`; now `READY_FOR_SALE`.

## Evidence

Real-iPhone test before release: `docs/plans/payments-auth-rebuild/real-iphone-test.md` (all four steps and the email save passed on Sandbox).

## Not done

- Adapty paywall stays at four products (`.t3` and `.t0` twins) on `onboarding` and `in_app`: runtimes 4–7 still read it. The new app pairs the twins and works with it.
- Sentry alert rules: both tokens lack alert write scope.
- Adapty sharing setting: not visible to the CLI.
- Rotating `ADAPTY_SECRET_KEY` and `ADAPTY_WEBHOOK_SECRET`: deferred by the owner.
- On-device proof that installs from the App Store receive the update (`docs/ota.md` release ritual step 3).

## Follow-up OTA — Paywall account link removed (runtime 8)

`d690ee6b` to runtime 8, group `607070b8-1b15-44ec-8612-7e686aa9d185`, update `01a17eec-371c-7f93-b0a5-ffb5297aae7a`, tag `ota-runtime8-20261027-d690ee6b`. Removes "Account and help" from the Paywall and moves Close onto the headline line; Restore purchases with nothing found opens "No purchase found" with Account and deletion (ADR 0092). `./excer check` (24 checks, including the new `paywall-no-account-link`) and the ship gate passed. Proofs on worker simulator `ExcerLock-payauth`: `paywall/no-account-link-on-paywall`, `paywall/restore-nothing-offers-account`, `paywall/offer-fallback-outage-keeps-retry`, and the twelve rerouted `account` proofs (`save-with-email-keeps-account` passed on its second run).

Runtimes 4–7 (1.0 and 1.0.1) still show the link; they cannot receive this bundle.

## OTA: one-time close offer

`39cf0e28` to runtime 8, group `7bb3c9e6-4524-4cc8-986c-aa835860eb87`, update `01a17f43-f78e-7295-8a63-818b20b7b41d`, tag `ota-runtime8-20261027-39cf0e28`. The first Close on the onboarding Paywall opens a one-time offer for `premium.annual.2999.t3` (ADR 0093). Adapty: new paywall `f73eb135-110b-48dd-a681-456e548c587f` (that product only) on new placement `close_offer` (`9ca9509a-b84f-4bfe-9c5f-0207340c1f74`), one audience, no experiment; other placements untouched. `./excer check` (24 checks) and the ship gate passed. Proofs on worker simulator `ExcerLock-payauth`: `paywall/close-offer-once`, `paywall/close-offer-claim-to-setup`, `paywall/close-offer-layout`. Not verified: the live Adapty placement serving through StoreKit on a device.
