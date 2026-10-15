---
id: enforcement
title: Screen Time enforcement and shields
routes: [diagnostics/bank-drain]
scenarios: [home-locked-walking, trial-active, bank-empty]
events: [shields_applied, shields_lifted, unlock_completed]
depends: [home]
---
## Sub-features
- The Lock decision is enforced through Screen Time: shields and DeviceActivity schedules, via `react-native-device-activity` and `modules/excerlock-enforcement`.
- The Swift extensions in `app-next/targets/*` (ShieldConfiguration, ShieldAction, DeviceActivityMonitor) run in their own iOS processes and share state only through App Group keys.
- Shield copy can be overridden remotely under a fixed App Group key (`excer check` `shield-copy-parity`).
- Bank drain has a dedicated native usage ladder and shield store; `/diagnostics/bank-drain` reads the real App Group record in dev builds, including Demo mode.

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

```proof
name: bank-shield-preview
scenario: bank-empty
open: /dev?stage=shield
expect: Your Bank is empty | Earn Points to buy more time | Open Shop
then-tap: Open Shop
then-expect: Shop | Points | 15 m | 1 h | 3 h | 6 h
```

```proof
name: bank-drain-bridge
scenario: trial-active
open: /diagnostics/bank-drain
swipe: 0.5,0.8,0.5,0.3
expect: Bank drain | Arm state: disarmed | Used minutes: 0 | Bank monitor: stopped | Bank shield: clear | Arm Bank
then-tap: Disarm Bank
then-open: /diagnostics/bank-drain
then-expect: Arm state: disarmed | Used minutes: 0 | Bank monitor: stopped | Bank shield: clear
```

## Gotchas
- The Bank diagnostic does not fabricate usage. Real ticks, re-arm continuity, interval continuation and the final Shield need an iPhone (see the Bank spec Device spike).
- App Group keys, shield causes and notification identifiers are invariants. The installed extensions read them byte for byte.
- App names and bundle ids never reach JavaScript. The locked apps are an opaque handle.
- Any report about enforcement must say it was not verified on a device.
