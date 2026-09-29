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
name: returning-paid-after-signin
scenario: returning-signed-in
open: /
tap: Sign in | Continue with Apple
expect: day streak | Apps blocked until
```

## Gotchas
- A dev build boots the fake runtime, with scenarios and fake adapters. Preview and production builds boot the real runtime (`src/runtime/environment.ts`). An unknown release environment fails closed.
- If the app shows real prices and ignores `excerlock://dev`, it is running a cached OTA update instead of Metro. `./excer sim start` detects this and reinstalls the app.
- `/` is a transient BootGate route. The OTA coordinator never counts it as a safe place to reload.
