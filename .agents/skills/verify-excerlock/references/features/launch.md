---
id: launch
title: Launch and routing
routes: [index]
scenarios: [fresh-install, returning-signed-in, returning-unpaid, returning-unpaid-remote-bypass-attempt, returning-expired, reinstall-keychain, subscription-proof-matching, subscription-proof-unavailable, subscription-proof-lapsed, returning-unpaid-ota-home, returning-unpaid-ota-unlock]
depends: [onboarding, paywall, setup, home]
---
## Sub-features
- `BootGate` restores the persisted stores, then resumes a returning account once per cold launch: a signed-in account remembered on this install opens Home (or Setup if it never finished), with no sign-in. Unfinished Onboarding resumes its saved page or Paywall. A fresh install, a reinstall, or a signed-out device with completed Setup starts at Welcome (ADR 0061, proposed ADR 0088).
- The Journey owns entry choice, account verification and paid admission. The last server-verified admission is remembered on the device, so a subscriber opens Home at once, even offline, while the server check runs in the background. A server answer of lapsed opens the Paywall. With no saved check, the launch cover stays up for one server check; an unavailable check opens the Paywall with recovery and retry, while Home stays locked (ADR 0087).
- Paid admission renews itself in Setup and the main app a minute before the five-minute server lease ends; while the server is unreachable the remembered admission holds until three days after the subscription's paid-through date (ADR 0059, ADR 0061).
- Startup signposts (`markStartupStage`) are for diagnostics. They never gate navigation.

## How to get to it (user POV)
Open the app. A subscriber who signed in on this phone lands on Home, even after closing the app, restarting the phone or going offline. A lapsed subscriber lands on the Paywall. An unfinished Onboarding resumes the saved page; reaching the Paywall saves it as the continuation destination. A first install, a reinstall or a signed-out phone with completed Setup lands on Welcome, where Get started or Sign in continue. An explicit Paywall link waits for launch recovery and account checks before opening checkout.

## Driving it with excer
`./excer sim start` launches the app on the real boot path. Then `./excer demo <scenario> --open /` shows where each Journey lands. `excerlock://dev?scenario=<id>&keep=1` loads a scenario as a fresh launch while keeping the saved data, which simulates reopening the app.

```proof
name: first-launch-welcome
scenario: fresh-install
open: /
expect: HACK your brain to hit your fitness goals | Get started | Sign in
```

```proof
name: direct-paywall-link
scenario: fresh-install
open: /paywall
expect: Get your DREAM BODY with ExcerLock | Continue | Restore purchases
relaunch-after-expect: true
after-relaunch-expect: Get your DREAM BODY with ExcerLock | Continue | Restore purchases
```

```proof
name: subscriber-opens-home
scenario: returning-signed-in
open: /
expect: day streak | Apps blocked until
relaunch-after-expect: true
after-relaunch-expect: day streak | Apps blocked until
then-open: /dev
then-expect: Journey app · paid yes · admitted yes
```

```proof
name: every-tab-opens
scenario: trial-active
open: /
actions: expect Apps blocked until | open /conditions | expect Add condition | open /analytics | expect This week: | open /settings | expect Manage subscription | open /
expect: Apps blocked until | Lock list
```

```proof
name: sign-in-survives-relaunch
scenario: reinstall-keychain
open: /
tap: Sign in | Continue with Apple
expect: day streak | Add condition
relaunch-after-expect: true
after-relaunch-expect: day streak | Add condition
then-open: /dev
then-expect: Journey app · paid yes · admitted yes
```

```proof
name: reinstall-keychain-stays-welcome
scenario: reinstall-keychain
open: /
expect: HACK your brain to hit your fitness goals | Get started | Sign in
```

```proof
name: offline-relaunch-keeps-home
scenario: subscription-proof-matching
open: /
expect: day streak | Apps blocked until
then-open: /dev?scenario=subscription-proof-unavailable&keep=1
then-expect: day streak | Apps blocked until
```

```proof
name: lapsed-while-away-opens-paywall
scenario: subscription-proof-matching
open: /
expect: day streak | Apps blocked until
then-open: /dev?scenario=subscription-proof-lapsed&keep=1
then-expect: Continue | Restore purchases
```

```proof
name: returning-unpaid-to-paywall
scenario: returning-unpaid
open: /
expect: Continue | Restore purchases
```

```proof
name: returning-expired-to-paywall
scenario: returning-expired
open: /
expect: Continue | Restore purchases | Close
then-open: /dev
then-expect: Journey paywall | Protected route mounts | None
```

```proof
name: remote-flags-not-authority
scenario: returning-unpaid-remote-bypass-attempt
open: /
expect: Continue | Restore purchases
deny-routes: protected
deny-expect: Continue | Restore purchases
then-open: /dev
then-expect: Journey paywall · paid no · admitted no | Remote flags sign-in optional review preset enabled paywall variant error | Protected route mounts | None
```

```proof
name: unpaid-home-deep-link-blocked
scenario: returning-unpaid
open: /
expect: Continue | Restore purchases
then-open: /home
then-expect: Continue | Restore purchases
```

```proof
name: all-protected-deep-links-blocked
scenario: returning-unpaid
open: /
expect: Continue | Restore purchases
deny-routes: protected
deny-expect: Continue | Restore purchases
then-open: /dev
then-expect: Protected route mounts | None
```

```proof
name: unpaid-home-notification-blocked
scenario: returning-unpaid
open: /
expect: Continue | Restore purchases
notifications: home
notification-expect: Continue | Restore purchases
then-open: /dev
then-expect: Journey paywall | Protected route mounts | None | Notification responses | Delivered home · Handled 1
```

```proof
name: unpaid-unlock-notification-blocked
scenario: returning-unpaid
open: /
expect: Continue | Restore purchases
notifications: unlock
notification-expect: Continue | Restore purchases
then-open: /dev
then-expect: Journey paywall | Protected route mounts | None | Notification responses | Delivered unlock · Handled 1
```

```proof
name: forged-onboarding-return-blocked
scenario: reinstall-keychain
open: /onboarding/S3d?returnTo=%2Fhome
tap: Continue
expect: Continue | Restore purchases | No payment due now
then-open: /dev
then-expect: Protected route mounts | None
```

```proof
name: unpaid-paywall-back-gesture-blocked
scenario: returning-unpaid
open: /
gesture: back
expect: Continue | Restore purchases | Close
then-open: /dev
then-expect: Journey paywall | Protected route mounts | None
```

```proof
name: unpaid-paywall-close-returns-welcome
scenario: returning-unpaid
open: /
tap: Close
expect: HACK your brain to hit your fitness goals | Get started | Sign in
then-open: /dev
then-expect: Journey welcome | Protected route mounts | None
```

```proof
name: unpaid-home-ota-envelope-blocked
scenario: returning-unpaid-ota-home
relaunch: true
open: /
expect: Continue | Restore purchases
then-open: /dev
then-expect: Journey paywall | OTA resume envelope | Denied /home | Protected route mounts | None
```

```proof
name: unpaid-unlock-ota-envelope-blocked
scenario: returning-unpaid-ota-unlock
relaunch: true
open: /
expect: Continue | Restore purchases
then-open: /dev
then-expect: Journey paywall | OTA resume envelope | Denied /unlock/gym | Protected route mounts | None
```

```proof
name: account-bound-proof-matches
scenario: subscription-proof-matching
open: /
expect: day streak | Apps blocked until
```

```proof
name: wrong-account-proof-fails-closed
scenario: subscription-proof-wrong-account
open: /
expect: Try again | Restore purchases | Account and help
absent: Checking your subscription | Connecting your subscription
then-open: /dev
then-expect: Journey paywall · paid no · admitted no | Protected route mounts | None
```

```proof
name: wrong-environment-proof-fails-closed
scenario: subscription-proof-wrong-environment
open: /
expect: Try again | Restore purchases | Account and help
absent: Checking your subscription | Connecting your subscription
then-open: /dev
then-expect: Journey paywall · paid no · admitted no | Protected route mounts | None
```

```proof
name: unavailable-proof-fails-closed
scenario: subscription-proof-unavailable
open: /
expect: Try again | Restore purchases | Account and help
absent: Retry will not start another purchase | verification is unavailable
then-open: /dev
then-expect: Journey paywall · paid no · admitted no | Protected route mounts | None
```

```proof
name: unavailable-proof-recovery-access
scenario: subscription-proof-unavailable
open: /
expect: Try again | Account and help
then-tap: Account and help
then-expect: Account and help | Restore purchases | Help and feedback
```

## Gotchas
- The real runtime (Metro started with `EXCERLOCK_ENV=preview`) fails to start on the simulator after a demo or proof granted Motion, because the simulator has no motion hardware. Run `xcrun simctl privacy <udid> revoke motion com.johansardar.excerlock`, then reopen the dev client.
- A dev build boots the fake runtime, with scenarios and fake adapters. Preview and production builds boot the real runtime (`src/runtime/environment.ts`). An unknown release environment fails closed.
- If the app shows real prices and ignores `excerlock://dev`, it is running a cached OTA update instead of Metro. `./excer sim start` detects this and reinstalls the app.
- `/` is a transient BootGate route. The OTA coordinator never counts it as a safe place to reload.

```proof
name: admission-renews-while-open
scenario: trial-active
open: /settings
actions: open /dev?advance=600000
expect: Settings | Manage subscription | Legal
then-open: /dev
then-expect: Journey app · paid yes · admitted yes
```

```proof
name: long-setup-keeps-admission
scenario: fresh-install
open: /sample-paywall?stage=sign-in
actions: tap Continue with Apple | tap Continue | tap Not now | open /dev?advance=360000 | tap Not now
expect: Home
absent: Get your DREAM BODY with ExcerLock
```
