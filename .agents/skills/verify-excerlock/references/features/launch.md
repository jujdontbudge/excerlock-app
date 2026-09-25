---
id: launch
title: Launch and routing
routes: [index]
scenarios: [fresh-install, trial-active, trial-expired]
depends: [onboarding, paywall, setup, home]
---
## Sub-features
- `BootGate` restores the persisted stores, then sends the user to the one screen their Journey allows: onboarding, the paywall, setup, or Home.
- Entitlement guards: without an Entitlement, setup and the tabs redirect to the paywall. An install that is already expired at a cold start gets the win-back placement once per session.
- Startup signposts (`markStartupStage`) are for diagnostics. They never gate navigation.

## How to get to it (user POV)
Open the app. A first install lands on the welcome screen. A subscriber lands on Home. A lapsed subscriber lands on the paywall.

## Driving it with excer
`./excer sim start` launches the app on the real boot path. Then `./excer demo <scenario> --open /` shows where each Journey lands.

```proof
name: first-launch-welcome
scenario: fresh-install
open: /
expect: Block apps. Move more. | Get started | Sign in
```

```proof
name: subscriber-lands-home
scenario: trial-active
open: /
expect: day streak | Apps blocked until
```

## Gotchas
- A dev build boots the fake runtime, with scenarios and fake adapters. Preview and production builds boot the real runtime (`src/runtime/environment.ts`). An unknown release environment fails closed.
- If the app shows real prices and ignores `excerlock://dev`, it is running a cached OTA update instead of Metro. `./excer sim start` detects this and reinstalls the app.
- `/` is a transient BootGate route. The OTA coordinator never counts it as a safe place to reload.
