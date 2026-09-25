---
id: setup
title: Setup, sign-in and permissions
routes: [setup/[step], permissions/[step], sign-in]
scenarios: [home-permission-needed, home-no-apps, home-walking-session]
events: [permission_resolved]
depends: [paywall, conditions]
---
## Sub-features
- After the paywall, `/setup/X1` runs sign-in first. It can be skipped unless the `signInRequired` flag says otherwise. Then comes one screen per Setup need, in the order `apps` (Screen Time and the locked apps), `motion`, `location` (Always for unlock-while-walking, While Using for a gym) and `gym` (opens the gym picker). The list comes from `src/domain/setupNeeds.ts`.
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

## Gotchas
- `excer` pre-grants simulator location, motion, camera and photos, so real iOS alerts do not block the screen. To see a real alert, run `xcrun simctl privacy <udid> reset all com.johansardar.excerlock`.
- iOS offers the upgrade from While Using to Always location only once. After a refusal, the flow sends the user to Settings.
- Setup steps `X3`–`X5` exist only so older saved installs can resume.
