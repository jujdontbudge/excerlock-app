---
id: settings
title: Settings hub and preferences
routes: [(tabs)/settings, settings/preferences, settings/units, settings/legal/index, settings/legal/[doc], settings/permission/[name]]
scenarios: [trial-active]
depends: [account, paywall, support]
---
## Sub-features
- The hub: the profile row, Manage subscription, Preferences, a Notifications switch, "Something not working?", Give feedback, Support (Mail), Legal, and the version footer.
- Privacy & permissions (`/settings/preferences`): six permission rows, Walk & Scroll stop grace, gym auto-detect, haptics, saved gyms, and the Screen Time app picker.
- Units (kilometres or miles), legal documents (privacy and terms), and permission detail pages.
- Seven taps on the version footer open the developer menu in dev builds, and turn filming mode on or off for two hours in production builds (ADR 0064). Settings shows "Filming mode on" under the version while it lasts.

## How to get to it (user POV)
Settings tab.

## Driving it with excer
Run `./excer demo trial-active --open /settings`, then `./excer sim tap "Preferences"`.

```proof
name: hub
scenario: trial-active
open: /settings
expect: Settings | Manage subscription | Something not working? | Legal
```

Haptics live under Preferences: a switch and a "Feel an unlock" preview row, shown only while haptics are on. The dev menu's "Haptics log" lists the intents that would have played, which is the simulator's evidence. The simulator cannot play or feel haptics.

```proof
name: haptics-preference
scenario: trial-active
open: /
tap: Sign in | Continue with Apple | Settings | Preferences
expect: Haptics | Feel choices, saves and unlocks | Feel an unlock
```

```proof
name: haptics-preview
scenario: trial-active
open: /
tap: Sign in | Continue with Apple | Settings | Preferences | Feel an unlock
expect: Haptics | Feel an unlock
then-open: /dev
then-expect: Haptics log | Haptic unlock
```

Filming mode cannot be timed on the simulator, which has no motion sensors. The proof checks the switch: the developer menu's Filming mode row writes the same store the production taps write, and Settings shows it.

```proof
name: filming-mode
scenario: trial-active
open: /dev
expect: Filming mode
tap: Filming mode
then-open: /settings
then-expect: Filming mode on
```

```proof
name: legal
scenario: trial-active
open: /settings/legal
expect: Privacy Policy | Terms of Use
```

## Gotchas
- The Haptics switch adds no app haptic, because the native switch plays its own. Turning it off cancels scheduled beats immediately. Account deletion resets it to on.
- Changing units relabels saved distance goals but does not convert them. An out-of-range goal blocks the change.
- The legal documents are placeholders (`app-next/src/packages/settings/lib/legalCopy.ts`).
