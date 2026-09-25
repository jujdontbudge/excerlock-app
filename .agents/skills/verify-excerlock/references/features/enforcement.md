---
id: enforcement
title: Screen Time enforcement and shields
routes: []
scenarios: [home-locked-walking, trial-active]
events: [shields_applied, shields_lifted, unlock_completed]
depends: [home]
---
## Sub-features
- The Lock decision is enforced through Screen Time: shields and DeviceActivity schedules, via `react-native-device-activity` and `modules/excerlock-enforcement`.
- The Swift extensions in `app-next/targets/*` (ShieldConfiguration, ShieldAction, DeviceActivityMonitor) run in their own iOS processes and share state only through App Group keys.
- Shield copy can be overridden remotely under a fixed App Group key (`excer check` `shield-copy-parity`).

## How to get to it (user POV)
Open a locked app during a scheduled window, and the ExcerLock shield covers it.

## Driving it with excer
The simulator cannot show real Screen Time shields. Preview the shield design with `./excer sim open "dev?stage=shield"`. Real enforcement needs a physical iPhone.

```proof
name: shield-preview
scenario: trial-active
open: dev?stage=shield
expect: Blocked by ExcerLock | steps to go to open your apps. | Open ExcerLock
```

## Gotchas
- App Group keys, shield causes and notification identifiers are invariants. The installed extensions read them byte for byte.
- App names and bundle ids never reach JavaScript. The locked apps are an opaque handle.
- Any report about enforcement must say it was not verified on a device.
