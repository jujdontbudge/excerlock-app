---
id: paywall
title: Paywall, trial and subscription
routes: [paywall, settings/subscription]
scenarios: [trial-active, trial-expired, billing-issue]
server: [POST /v1/subscription/resync, POST /v1/webhooks/adapty]
events: [paywall_viewed, purchase_started, paywall_error]
depends: [launch]
---
## Sub-features
- The onboarding hard wall: no decline and no close. Adapty placements for onboarding, in-app and win-back. A win-back load failure falls back to the placement the surface would otherwise request.
- Purchase and restore are serialized and show a busy state. Cancel, error and not-found never grant access.
- Settings → Manage subscription shows the plan status (trial, active, billing issue) and links to App Store management and restore.
- The server mirrors entitlements from Adapty webhooks and resyncs on request.

## How to get to it (user POV)
Finish onboarding and the paywall appears. A subscriber reaches it through Settings → Manage subscription. A lapsed user sees the win-back paywall at launch.

## Driving it with excer
Dev controls change outcomes without touching StoreKit: add `&outcome=success|cancel|error` or `&restore=restored|notFound` to the dev URL. For example, `./excer sim open "dev?scenario=trial-expired&outcome=error"`.

```proof
name: subscription-billing-issue
scenario: billing-issue
open: /settings/subscription
expect: Subscription | Billing issue | Manage in App Store | Restore purchases
```

```proof
name: winback-after-trial
scenario: trial-expired
open: /
relaunch: true
expect: Your trial has ended | Start for free
wait: 25
```

## Gotchas
- The app uses Adapty, not RevenueCat.
- In a dev build the paywall is a local stand-in with dash prices. Seeing real prices means the real runtime is running (see the launch Gotchas).
- A new PostHog flag, or a new consumer of `paywall_variant`, is App Store submission material, never an OTA (`docs/ota.md`, `excer check` `flag-registry`).
- The win-back paywall should appear on a cold start that is already expired (`useLapsedWinbackOffer`). A lapse during a session uses the in-app placement instead, which is why that proof sets `relaunch: true`.
- **Open finding (2026-09-24):** `winback-after-trial` fails. After a cold launch into `trial-expired`, Home shows Locked and no paywall appears. It could be a real bug or a demo-hydration artifact (the entitlement passing through `active` before `expired` would skip the offer). Investigate before changing the proof.
- Account access survives a subscription lapse (ADR 0024).
