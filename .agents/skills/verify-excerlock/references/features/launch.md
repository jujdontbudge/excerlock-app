---
id: launch
title: Launch and routing
routes: [index]
scenarios: [fresh-install, returning-signed-in, returning-unpaid, returning-unpaid-remote-bypass-attempt, returning-expired, returning-offline-stale-profile, returning-offline-renewal-due, reinstall-keychain, returning-unpaid-ota-home, returning-unpaid-ota-unlock]
depends: [onboarding, paywall, setup, home]
---
## Sub-features
- `BootGate` restores the persisted stores, then resumes once per cold launch. Entering the app needs a finished onboarding and Premium from the phone's last Adapty profile; no sign-in and no server check stand in the way (payments and auth rebuild, `docs/plans/payments-auth-rebuild/`).
- The last Adapty profile is kept on the device, so a subscriber opens Home at once, even offline or with the API down. While access is `checking` (no profile yet) the last known state holds; only a profile that says inactive opens the Paywall. A timeout, a network error or an account change never does. An active, auto-renewing profile keeps access for three days past its renewal date, so a subscriber who renewed while offline is not locked out. When a profile with Premium arrives while the Paywall is open, the Paywall continues by itself.
- A fresh install, a reinstall or a signed-out device without Premium starts at Welcome.
- Startup signposts (`markStartupStage`) are for diagnostics. They never gate navigation.

## How to get to it (user POV)
Open the app. A subscriber who signed in on this phone lands on Home, even after closing the app, restarting the phone or going offline. A lapsed subscriber lands on the Paywall. A first install, a reinstall or a signed-out phone lands on Welcome, where Get started or Sign in continue.

## Driving it with excer
`./excer sim start` launches the app on the real boot path. Then `./excer demo <scenario> --open /` shows where each Journey lands. `excerlock://dev?scenario=<id>&keep=1` loads a scenario as a fresh launch while keeping the saved data, which simulates reopening the app.

```proof
name: first-launch-welcome
scenario: fresh-install
open: /
expect: HACK your brain to hit your fitness goals | Get started | Sign in
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
name: offline-renewal-due-keeps-access
scenario: returning-offline-renewal-due
open: /
expect: Home | Conditions
absent: Get your DREAM BODY with ExcerLock
then-open: /dev
then-expect: Journey app · paid yes
```

```proof
name: offline-expired-profile-opens-paywall
scenario: returning-offline-stale-profile
open: /
expect: Continue | Restore purchases
absent: Apps blocked until
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
then-expect: Journey paywall · paid no | Protected route mounts | None
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

## Gotchas
- The real runtime (Metro started with `EXCERLOCK_ENV=preview`) fails to start on the simulator after a demo or proof granted Motion, because the simulator has no motion hardware. Run `xcrun simctl privacy <udid> revoke motion com.johansardar.excerlock`, then reopen the dev client.
- A dev build boots the fake runtime, with scenarios and fake adapters. Preview and production builds boot the real runtime (`src/runtime/environment.ts`). An unknown release environment fails closed.
- If the app shows real prices and ignores `excerlock://dev`, it is running a cached OTA update instead of Metro. `./excer sim start` detects this and reinstalls the app.
- `/` is a transient BootGate route. The OTA coordinator never counts it as a safe place to reload.

```proof
name: access-holds-while-open
scenario: trial-active
open: /settings
actions: open /dev?advance=600000
expect: Settings | Manage subscription | Legal
absent: Get your DREAM BODY with ExcerLock
then-open: /dev
then-expect: Journey app · paid yes
```

```proof
name: long-setup-keeps-access
scenario: fresh-install
open: /sample-paywall
open-wait: 6
actions: expect Yearly $39.99/year | tap Continue | expect Allow Screen Time | open /dev?advance=360000
expect: Allow Screen Time
absent: Get your DREAM BODY with ExcerLock | Continue with Apple
```
