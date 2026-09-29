---
id: dev-harness
title: Developer harness and research screens
routes: [dev, diagnostics/sensors, linked-trace]
scenarios: [dynamic-type-xl, reduce-motion, identity-lab-account-isolation]
depends: [launch]
---
## Sub-features
- `/dev`: the dev menu, scenario loading (`dev?scenario=<id>`), outcome controls (`restore`, `outcome`, `prompt`, `setup=X1..X5`), the component preview gallery, and the shield preview.
- `/diagnostics/sensors`: a sensor smoke screen, available only in dev builds.
- `/linked-trace`: the Linked Recorder research screen. It is compiled in only for research builds and is disabled in the App Store bundle.

## How to get to it (user POV)
Not user-facing. In a dev build, tap the Settings version footer seven times.

## Driving it with excer
`./excer demo <id>` uses `dev?scenario=`. Use `./excer demo list` for the ids.

```proof
name: dev-menu
scenario: trial-active
open: /dev
expect: Developer menu | Local scenarios and component previews.
```

```proof
name: account-data-a-b-a-isolation
scenario: identity-lab-account-isolation
open: /dev
tap: Run A B A isolation
expect: Account data | Active account A | Legacy data Quarantined | Condition owner Account A | History Days 1 | Profile Account A | Saved Gym Gym A | Checkpoints A account-a/1/Account A/Gym A · B account-b/1/Account B/Gym B · A account-a/1/Account A/Gym A
```

```proof
name: account-switch-preserves-enforcement-until-ready
scenario: identity-lab-account-isolation
open: /dev
tap: Run account switch ordering
wait: 30
expect: Account data | Active account A | Condition owner Account A | Saved Gym Gym A | Switch ordering Preserved while unready · B loaded before ready · B ready · Preserved while unready · A loaded before ready · A ready
```

## Gotchas
- `/dev` exists only in `__DEV__` builds. "Unmatched Route" means the app is not running a Metro dev bundle.
- The demo fakes are dev-only and live in the `dev-harness` package; the layer rules stop any product package from importing them.
