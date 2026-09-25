---
name: verify-excerlock
description: Verify an ExcerLock change on the simulator with ./excer. Use after any app behavior or UI change, or to find how a feature is reached.
---

# Verify ExcerLock

A change is done when you have seen it work through the path a user takes, and you can point at the evidence. `./excer` gives you control of the app. The feature map gives you the context: what exists and how to reach it.

## Loop

1. **Find the feature.** Run `./excer feature list`, then `./excer feature show <id>`. For a file you changed, `./excer feature routes` shows which feature owns each screen. Read the feature's Gotchas before you start.
2. **Check statically.** `./excer check` must pass. It runs typecheck, lint and the repository invariants, and it enforces ratchets that may only go down.
3. **Drive it.** Use `./excer demo <scenario> --open <route>` to put the app into a known state. Then `./excer sim tree` reads what is on screen, `./excer sim tap "<label>"` presses things, and `./excer sim shot` saves a screenshot. Everything is headless: Simulator.app stays closed, and the installed build is reused.
4. **Prove it.** `./excer prove <feature>` runs the feature's proof blocks. It saves screenshots, labels and `result.json` under `.excer/proof/`. If your change adds or changes visible behavior, add or update a proof block first, watch it fail, then make it pass.
5. **Report.** Say which proofs passed, give the evidence path, and name anything you could not verify, for example real Screen Time shields, HealthKit or physical motion. Never report blocked verification as passed.

## Feature files

`references/features/<id>.md` has front matter followed by four sections:

```
---
id: gym
title: Gym conditions and check-in
routes: [unlock/gym, gym-picker]      route files under app-next/app, without extension
scenarios: [gym-arrival-user]         ids from `./excer demo list`
server: [POST /v1/incident-reports]   endpoints the feature calls
events: [gym_unlock_confirmed]        analytics events it emits
depends: [conditions]                 features it builds on
---
## Sub-features
## How to get to it (user POV)
## Driving it with excer
## Gotchas
```

Put proofs inside "Driving it with excer" as fenced `proof` blocks. Separate expected labels with `|`. A label matches when it contains the text.

````
```proof
name: arrival-locked
scenario: gym-arrival-user
open: /home
expect: Locked | Arrive at the gym | I'm at the gym
```
````

Proof fields:
- `scenario`: loaded after a cold relaunch.
- `open`: a route or URL.
- `prompt`: `grant` (the default), `deny` or `ask`.
- `relaunch: true`: cold-launch again after the load, for behavior that happens only at startup.
- `wait`: how many seconds to wait. The default is 15.

`./excer feature check` fails when a route belongs to no feature, or when a feature names a route, scenario, endpoint, event or dependency that does not exist. `./excer check` runs it too. When you add a screen, add it to a feature in the same change.

`./excer feature graph` prints a Mermaid graph of features, screens, scenarios, endpoints and events. Add `--format json` or `--format dot` for other formats, and `--focus <id>` to limit it to one feature.
