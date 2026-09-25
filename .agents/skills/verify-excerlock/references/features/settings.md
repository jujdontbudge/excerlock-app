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
- Seven taps on the version footer open the developer menu (dev builds).

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

```proof
name: legal
scenario: trial-active
open: /settings/legal
expect: Privacy Policy | Terms of Use
```

## Gotchas
- Changing units relabels saved distance goals but does not convert them. An out-of-range goal blocks the change.
- The legal documents are placeholders (`app-next/src/packages/settings/lib/legalCopy.ts`).
