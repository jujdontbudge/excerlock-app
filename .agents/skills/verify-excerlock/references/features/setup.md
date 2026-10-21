---
id: setup
title: Setup, sign-in and permissions
routes: [setup/[step], permissions/[step], sign-in]
scenarios: [home-permission-needed, home-no-apps, home-walking-session, trial-active, permission-journey, permission-condition-entry, permission-gym-setup]
events: [permission_resolved]
depends: [paywall, conditions]
---
## Sub-features
- After the paywall, `/setup/X1` requires an explicit Apple, Google or email-code sign-in unless this install already remembers the account; no skip. The sign-in is remembered until Sign out or Delete account, so closing, killing or updating the app never asks again; a reinstall does (ADR 0061). Then comes Allow Screen Time, Choose apps to lock, Motion, Location While Using and (for Walking state) its Always upgrade, then Gym. Pages remain in place until the real request resolves; allow and deny advance automatically. Choosing Locked apps retains a counts summary and requires Continue. The list comes from `permissions/setupNeeds.ts`.
- `PermissionGuide` draws the exact iOS alert with an arrow pointing at the choice to tap.
- Home's reminder card ("Your apps are not locked yet", "Walks cannot open your apps yet") and saving a condition that needs something new both open the same screens at `/permissions/<step>`, without sign-in.
- Sign-in with Apple, Google or an email code, also reachable from Settings and the welcome screen.

## How to get to it (user POV)
Buy or start the trial, and setup begins. Later, tap the reminder card on Home, or turn on a condition that needs a new permission.

## Driving it with excer
`./excer demo home-no-apps --open /home`, then `./excer sim tap "Choose apps"`. In a dev build the email code is `123456`. Use `--prompt deny` to exercise the path where the user refuses.

```proof
name: reminder-card-no-apps
scenario: home-no-apps
open: /home
expect: Your apps are not locked yet | Choose apps
```

```proof
name: reminder-card-walking
scenario: home-walking-session
open: /home
expect: Walks cannot open your apps yet | Turn on
```

```proof
name: sign-in-provider-options
scenario: fresh-install
open: /sample-paywall?stage=sign-in
expect: Create your account | Use a new or existing account to keep your plan and subscription. | Continue with Apple | Continue with Google | Continue with email
```

```proof
name: returning-session-opens-home
scenario: returning-signed-in
open: /home
expect: Locked | Home
```

```proof
name: returning-settings-opens
scenario: returning-signed-in
open: /settings/account
expect: Account | Signed in with Apple | Sign out
```

```proof
name: sign-out-relaunch-stays-welcome
scenario: returning-signed-in
open: /settings/account
tap: Sign out
expect: HACK your brain to hit your fitness goals | Get started | Sign in
relaunch-after-expect: true
after-relaunch-expect: HACK your brain to hit your fitness goals | Get started | Sign in
```

```proof
name: sign-in-after-paywall-is-sign-up
scenario: returning-signed-in
open: /sample-paywall?stage=sign-in
expect: Create your account | Use a new or existing account to keep your plan and subscription. | Continue with Apple
```

```proof
name: welcome-sign-in-is-returning
scenario: reinstall-keychain
open: /
tap: Sign in
expect: Welcome back | Sign in again to open ExcerLock. | Continue with Apple
```

```proof
name: start-over-sign-in-keeps-onboarding-plan
scenario: fresh-install
open: /sample-paywall?stage=sign-in
tap: Back | Sign in | Continue with Apple | Continue
expect: Allow Screen Time
```

```proof
name: sign-in-email
scenario: fresh-install
open: /sample-paywall?stage=sign-in
tap: Continue with email
expect: Sign up with email | Email address | Send code | Back to sign-in options
```

```proof
name: post-purchase-setup-layout
scenario: fresh-install
open: /sample-paywall?stage=sign-in
actions: tap Continue with Apple | expect Restore purchases
swipe: 0.5,0.8,0.5,0.2
expect: Continue | Restore purchases
then-tap: Continue
then-expect: Allow Screen Time | Not now | Don’t Allow
```

```proof
name: sign-in-google-action
scenario: trial-active
open: /sample-paywall?stage=sign-in
tap: Continue with Google
expect: Walk 10,000 steps | Walk 5,000 steps | Home
```

```proof
name: sign-in-apple-action
scenario: trial-active
open: /sample-paywall?stage=sign-in
tap: Continue with Apple
expect: Walk 10,000 steps | Walk 5,000 steps | Home
```

## Gotchas
- `returning-signed-in` restores a signed-in fake Session with completed Setup and no remembered account, like an install updated from build 17, and BootGate resumes it to Home. `reinstall-keychain` keeps the Keychain session but has no saved app data, so it starts at Welcome.
- `excer` pre-grants simulator location, motion, camera and photos, so real iOS alerts do not block the screen. To see a real alert, run `xcrun simctl privacy <udid> reset all com.johansardar.excerlock`.
- iOS offers the upgrade from While Using to Always location only once. After a refusal, the flow sends the user to Settings.
- Setup steps `X3`–`X5` exist only so older saved installs can resume.
- Don't Allow on Apple's Screen Time prompt leaves iOS at `notDetermined`, and Settings has no Screen Time switch for an app iOS never approved. The next Allow Screen Time page asks again rather than offering Open Settings (ADR 0085).

```proof
name: screen-time-separate-page
scenario: permission-journey
open: /permissions/apps
expect: Allow Screen Time | Tap “Continue” | Don’t Allow
absent: Choose apps to lock
```

```proof
name: screen-time-pretend-deny-requests
scenario: permission-journey
open: /permissions/apps
prompt: grant
tap: Don’t Allow
expect: Choose apps to lock | Choose apps | Your choices stay on your iPhone.
absent: Count your steps
```

```proof
name: screen-time-denial-skips-picker
scenario: permission-journey
open: /permissions/apps
prompt: deny
tap: Continue
expect: Count your steps | Allow
absent: Choose apps to lock
```

```proof
name: screen-time-denial-asks-again
scenario: permission-journey
open: /permissions/apps
prompt: deny
actions: tap Continue | expect Count your steps | open /permissions/apps
expect: Allow Screen Time | Tap “Continue” | Don’t Allow
absent: Open Settings | Screen Time is off
```

```proof
name: screen-time-off-asks-before-settings
scenario: home-permission-needed
open: /permissions/apps
prompt: grant
tap: Open Settings
expect: Choose apps to lock | Choose apps
```

```proof
name: motion-denial-advances
scenario: permission-journey
open: /permissions/apps
prompt: deny
tap: Continue | Allow
expect: Unlock apps as you walk | Allow While Using App
```

```proof
name: location-denial-advances
scenario: permission-journey
open: /permissions/apps
prompt: deny
tap: Continue | Allow | Allow While Using App
expect: Pick your gym | Choose gym
absent: Change to Always Allow
```

```proof
name: picker-summary-before-continue
scenario: home-no-apps
open: /permissions/apps
tap: Choose apps | Social | Done
expect: Choose apps to lock | Locked apps | Change apps | Continue
```

```proof
name: home-reminder-opens-picker
scenario: home-no-apps
open: /home
tap: Choose apps
expect: Choose apps to lock | Choose apps
```

- Real-permission evidence uses `EXPO_PUBLIC_EXCER_NATIVE_PERMISSIONS=1` on Metro and excer commands. Identity, purchase and activity remain fixtures; permission requests and Apple picker use production native adapters. This option disables excer's automatic privacy grants. Uninstall/reinstall for fresh answers, and use `privacy reset all` if TCC retains an answer. Ordinary proof blocks use the fake boundary for deterministic automation.
- Screen Time's authorization sheet has no accessibility labels on this simulator; capture it and use screenshot-derived coordinates for Allow with Passcode/Done. Simulator passcode `123456` is accepted.
- ScreensDesign research is recorded in `docs/research/permission-app-selection.md`.

```proof
name: settings-unanswered-motion
scenario: permission-journey
open: /settings/permission/motion
expect: Motion & Fitness | Don’t Allow | Allow | Continue
absent: Open Settings | Not requested
```

```proof
name: settings-unanswered-notifications
scenario: permission-journey
open: /settings/permission/notifications
expect: Notifications | Don’t Allow | Allow | Continue
absent: Open Settings | Not requested
```


```proof
name: condition-needs-motion
scenario: permission-condition-entry
open: /builder
tap: Walking | Continue | Continue | Reach a step goal | Continue | Continue | Continue | Save
expect: Count your steps | Allow | Don’t Allow
```

```proof
name: paid-setup-gym-picker
scenario: permission-gym-setup
open: /paywall
tap: Sign in | Continue with Apple | Choose gym
expect: Save gym
```

```proof
name: settings-camera-denial-return
scenario: permission-journey
open: /settings/permission/camera
prompt: deny
tap: Allow
expect: Home
then-open: /settings/permission/camera
then-expect: Camera | Open Settings
```

```proof
name: settings-notifications-denial-return
scenario: permission-journey
open: /settings/permission/notifications
prompt: deny
tap: Don’t Allow
expect: Home
then-open: /settings/permission/notifications
then-expect: Notifications | Open Settings
```

```proof
name: always-denial-settings
scenario: home-walking-session
open: /settings/permission/location
prompt: deny
tap: Keep Only While Using
expect: Home
then-open: /settings/permission/location
then-expect: Location | Open Settings
```
