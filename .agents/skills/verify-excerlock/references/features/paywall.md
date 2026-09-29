---
id: paywall
title: Paywall, trial and subscription
routes: [paywall, settings/subscription]
scenarios: [fresh-install, trial-active, trial-expired, billing-issue, identity-lab-user-sync-failed, identity-lab-slow-cold-start, identity-lab-anonymous-failed, identity-lab-plans-failed, identity-lab-purchase-cancelled, identity-lab-apple-linked]
server: [POST /v1/subscription/resync, POST /v1/webhooks/adapty]
events: [paywall_viewed, purchase_started, paywall_error]
depends: [launch]
---
## Sub-features
- The onboarding hard wall: no decline and no close. Adapty placements for onboarding, in-app and win-back. A win-back load failure falls back to the placement the surface would otherwise request.
- Three promise rows reflect the selected fat/muscle targets, the goal chosen at O08, and the O10 screen-time estimate. When both body targets are selected, they take two rows and the time estimate takes the third; otherwise the goal choice fills the remaining row.
- Purchase and restore are serialized and show a busy state. Cancel, error and not-found never grant access.
- Settings → Manage subscription shows the plan status (trial, active, billing issue) and links to App Store management and restore.
- The server mirrors entitlements from Adapty webhooks and resyncs on request.

## How to get to it (user POV)
Finish onboarding and the paywall appears. A subscriber reaches it through Settings → Manage subscription. A lapsed user sees the win-back paywall at launch.

## Driving it with excer
Dev controls change outcomes without touching StoreKit: add `&outcome=success|cancel|error` or `&restore=restored|notFound` to the dev URL. For example, `./excer sim open "dev?scenario=trial-expired&outcome=error"`.

```proof
name: premium-headline
scenario: fresh-install
open: /onboarding/S3
tap: Import
expect: Once you hit 10,000 steps, your apps will unlock. | Continue
then-open: /paywall
then-expect: Become ADDICTED to exercise | Feel stronger and healthier every week | Make time for what matters | Save 46 days a year | Start for free
```

```proof
name: personalized-fat-goal
scenario: fresh-install
open: /onboarding/O08
tap: Less screen time | Continue | Lose fat | Continue | Continue
expect: How many hours do you currently spend scrolling each day?
then-open: /paywall
then-expect: Lose 15.0 pounds of fat | Spend less time scrolling | Save 46 days a year
```

```proof
name: personalized-muscle-goal
scenario: fresh-install
open: /onboarding/O08
tap: More exercise | Continue | Gain muscle | Continue | Continue
expect: How many hours do you currently spend scrolling each day?
then-open: /paywall
then-expect: Gain 10.0 pounds of muscle | Make movement part of your day | Save 46 days a year
```

```proof
name: personalized-both-goals
scenario: fresh-install
open: /onboarding/O08
tap: More exercise | Continue | Gain muscle | Lose fat | Continue | Continue | Continue
expect: How many hours do you currently spend scrolling each day?
then-open: /paywall
then-expect: Lose 15.0 pounds of fat | Gain 10.0 pounds of muscle | Save 46 days a year
```

```proof
name: personalized-maintain-goal
scenario: fresh-install
open: /onboarding/O08
tap: Overall wellness | Continue | Maintain | Continue
expect: How many hours do you currently spend scrolling each day?
then-open: /paywall
then-expect: Stay fit, strong and healthy for life | Make room for your wellbeing | Save 46 days a year
```

```proof
name: personalized-other-goal
scenario: fresh-install
open: /onboarding/O08
tap: Something else | Continue | Maintain | Continue
expect: How many hours do you currently spend scrolling each day?
then-open: /paywall
then-expect: Stay fit, strong and healthy for life | Make time for what matters | Save 46 days a year
```

```proof
name: personalized-screen-time-estimate
scenario: fresh-install
open: /onboarding/O10
tap: 4 to 6 hours
expect: How many hours do you currently spend scrolling each day?
then-open: /paywall
then-expect: Save 76 days a year
```

```proof
name: subscription-billing-issue
scenario: billing-issue
open: /settings/subscription
expect: Subscription | Billing issue | Manage in App Store | Restore purchases
```

```proof
name: winback-after-trial
scenario: trial-lapsed-while-closed
relaunch: true
expect: Your trial has ended | Start for free
wait: 45
then-open: dev
then-expect: "placement":"winback"
```

```proof
name: lapse-in-session
scenario: trial-lapses-in-session
relaunch: true
expect: Your trial has ended | Start for free
wait: 45
then-open: dev
then-expect: "placement":"in_app"
```

```proof
name: identity-sync-retry
scenario: identity-lab-user-sync-failed
open: /paywall
wait: 25
expect: Lab annual · $49.99 / year | Lab monthly · $9.99 / month | Start for free
```

```proof
name: identity-slow-cold-start-loading
scenario: identity-lab-slow-cold-start
relaunch: true
wait: 8
expect: Loading plans…
```

```proof
name: identity-slow-cold-start
scenario: identity-lab-slow-cold-start
relaunch: true
wait: 25
expect: Lab annual · $49.99 / year | Lab monthly · $9.99 / month | Start for free
```

```proof
name: identity-anonymous-retry
scenario: identity-lab-anonymous-failed
open: /paywall
wait: 25
expect: Lab annual · $49.99 / year | Lab monthly · $9.99 / month | Start for free
```

```proof
name: identity-plans-retry
scenario: identity-lab-plans-failed
open: /paywall
tap: Retry loading plans
expect: Lab annual · $49.99 / year | Lab monthly · $9.99 / month | Start for free
```

```proof
name: identity-purchase-to-setup
scenario: identity-lab-user-sync-failed
open: /paywall
tap: Start for free | Skip for now
wait: 25
expect: Choose apps
```

```proof
name: identity-purchase-cancelled
scenario: identity-lab-purchase-cancelled
open: /paywall
tap: Start for free
wait: 25
expect: Choose a plan to continue.
```

```proof
name: identity-restore-not-found
scenario: identity-lab-user-sync-failed
open: /paywall
tap: Restore purchases
wait: 25
expect: No active purchase was found.
```

```proof
name: identity-account-switch
scenario: identity-lab-apple-linked
open: /sign-in
tap: Continue with Apple | Recover with Apple
expect: ExcerLock
then-open: /paywall
then-expect: Lab annual · $49.99 / year | Lab monthly · $9.99 / month | Start for free
```

## Gotchas
- The app uses Adapty, not RevenueCat.
- In a dev build the paywall is a local stand-in with dash prices. Seeing real prices means the real runtime is running (see the launch Gotchas).
- A new PostHog flag, or a new consumer of `paywall_variant`, is App Store submission material, never an OTA (`docs/ota.md`, `excer check` `flag-registry`).
- The win-back paywall appears when the first live entitlement of a launch is `expired`, even though the persisted store still says `trial` from the last run (the real app hydrates `trial`, then Adapty's first profile says `expired`). `trial-lapsed-while-closed` reproduces it: Home mounts on the hydrated `trial`, and the fake publishes `expired` 20 s after launch (`entitlementTimeline`). `trial-lapses-in-session` publishes a live `trial` at 1 s and `expired` at 20 s, which must show the in-app placement instead. Both proofs read the placement from the fake `paywall_viewed` event on `dev`. A lapse observed live after a live `trial`/`active` in the same session (`subscription/winbackSession.ts`) does not trigger it. Do not deep-link after the relaunch: opening a URL rebuilds navigation and remounts Home.
- Account access survives a subscription lapse (ADR 0024).
