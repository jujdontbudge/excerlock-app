---
id: dev-harness
title: Developer harness and research screens
routes: [dev, diagnostics/sensors, linked-trace]
scenarios: [dynamic-type-xl, reduce-motion]
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

## Gotchas
- `/dev` exists only in `__DEV__` builds. "Unmatched Route" means the app is not running a Metro dev bundle.
- The demo fakes are dev-only (`src/demo`). Features must never import them.
