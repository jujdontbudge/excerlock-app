---
id: launch
title: Launch and routing
routes: [index]
scenarios: [fresh-install, returning-signed-in, returning-unpaid]
depends: [onboarding, paywall, setup, home]
---
## Sub-features
- `BootGate` restores the persisted stores but starts each new entry at Welcome. A saved session, Setup or Entitlement cannot pick Home.
- The Journey owns entry choice, account verification and paid admission; main routes require matching explicit authentication and valid Entitlement.
- Startup signposts (`markStartupStage`) are for diagnostics. They never gate navigation.

## How to get to it (user POV)
Open the app. A first install, returning subscriber, or lapsed subscriber lands on Welcome. Choose the full Onboarding or Sign in; valid subscription and account verification are required before Home.

## Driving it with excer
`./excer sim start` launches the app on the real boot path. Then `./excer demo <scenario> --open /` shows where each Journey lands.

```proof
name: first-launch-welcome
scenario: fresh-install
open: /
expect: Block apps. Move more. | Get started | Sign in
```

```proof
name: subscriber-starts-welcome
scenario: returning-signed-in
open: /
expect: Block apps. Move more. | Get started | Sign in
```

```proof
name: unpaid-starts-welcome
scenario: returning-unpaid
open: /
expect: Block apps. Move more. | Get started | Sign in
```

```proof
name: returning-unpaid-to-paywall
scenario: returning-unpaid
open: /
tap: Sign in | Continue with Apple
expect: Start for free | Restore purchases
```

```proof
name: unpaid-home-deep-link-blocked
scenario: returning-unpaid
open: /
tap: Sign in | Continue with Apple
expect: Start for free | Restore purchases
then-open: /home
then-expect: Start for free | Restore purchases
```

```proof
name: all-protected-deep-links-blocked
scenario: returning-unpaid
open: /
tap: Sign in | Continue with Apple
expect: Start for free | Restore purchases
deny-routes: protected
deny-expect: Start for free | Restore purchases
then-open: /dev
then-expect: Protected route mounts | None
```

```proof
name: unpaid-home-notification-blocked
scenario: returning-unpaid
open: /
tap: Sign in | Continue with Apple
expect: Start for free | Restore purchases
notifications: home
notification-expect: Start for free | Restore purchases
then-open: /dev
then-expect: Journey paywall | Protected route mounts | None | Notification responses | Delivered home · Handled 1
```

```proof
name: unpaid-unlock-notification-blocked
scenario: returning-unpaid
open: /
tap: Sign in | Continue with Apple
expect: Start for free | Restore purchases
notifications: unlock
notification-expect: Start for free | Restore purchases
then-open: /dev
then-expect: Journey paywall | Protected route mounts | None | Notification responses | Delivered unlock · Handled 1
```

```proof
name: forged-onboarding-return-and-paywall-back-blocked
scenario: returning-unpaid
open: /onboarding/S3d?returnTo=%2Fhome
tap: Continue | Back
expect: We'll send you a reminder before your trial ends | No payment due now
then-open: /dev
then-expect: Journey onboarding | Protected route mounts | None
```

```proof
name: returning-paid-after-signin
scenario: returning-signed-in
open: /
tap: Sign in | Continue with Apple
expect: day streak | Apps blocked until
```

```proof
name: account-bound-proof-matches
scenario: subscription-proof-matching
open: /
tap: Sign in | Continue with Apple
expect: day streak | Apps blocked until
```

```proof
name: wrong-account-proof-fails-closed
scenario: subscription-proof-wrong-account
open: /
tap: Sign in | Continue with Apple
expect: Checking your subscription | Retry | Back to start
```

```proof
name: wrong-environment-proof-fails-closed
scenario: subscription-proof-wrong-environment
open: /
tap: Sign in | Continue with Apple
expect: Checking your subscription | Retry | Back to start
```

```proof
name: unavailable-proof-fails-closed
scenario: subscription-proof-unavailable
open: /
tap: Sign in | Continue with Apple
expect: Checking your subscription | Retry | Back to start
```

## Gotchas
- A dev build boots the fake runtime, with scenarios and fake adapters. Preview and production builds boot the real runtime (`src/runtime/environment.ts`). An unknown release environment fails closed.
- If the app shows real prices and ignores `excerlock://dev`, it is running a cached OTA update instead of Metro. `./excer sim start` detects this and reinstalls the app.
- `/` is a transient BootGate route. The OTA coordinator never counts it as a safe place to reload.
