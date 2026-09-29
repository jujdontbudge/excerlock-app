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
4. **Prove the changed behavior, not every feature.** Add or update the relevant proof block, watch it fail against the old behavior, then run `./excer prove <feature> --proof <name>`. It saves a screenshot, labels and `result.json` under `.excer/proof/`. A full `./excer prove <feature>` or multi-feature sweep requires the user's explicit request. Do not repeat already-proven unchanged paths after a merge. Run proofs individually with visible progress and a five-minute outer timeout; if a command stalls, stop and report it as blocked rather than extending the deadline or silently starting another suite.
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
- `relaunch-after-expect: true` and `after-relaunch-expect`: after the initial actions and `expect` pass, save a before-relaunch screenshot, cold-relaunch, and require the second label set. Use this to prove a transition from a genuinely established runtime state across process death.
- `tap`: labels to tap in order after `open`, separated by `|`. Use it to change state without a deep link, because opening a URL rebuilds navigation and remounts screens.
- `actions`: ordered `tap <label>` and `type <text>` actions separated by `|`. Use it for a user path that interleaves form entry and buttons. Typed values are redacted to their character counts in `result.json`.
- `gesture: back`: performs and records one iOS edge-swipe after the taps and before checking `expect`.
- `wait`: how many seconds to wait. The default is 15.
- `then-open` and `then-expect`: after `expect` is met, open another route and expect more labels. Use it to read a side effect, such as the fake analytics events on `dev`. The first screen is saved as `<name>.before.png`.
- `then-tap`: after `expect` is met and its `<name>.before.png` is saved, tap another sequence before `then-open` / `then-expect`. Use it when a confirmation sheet must be evidenced before its destructive action.
- `deny-routes: protected` and `deny-expect`: derive every paid route from the Expo route files, deep-link each one, and require the denial labels before continuing. Route attempts are recorded in `result.json`.

Metro runs without a file watcher. Before driving the app, `excer` restarts Metro whenever a file under `app-next/src`, `app` or `modules` is newer than Metro's start, and it refuses to continue if the bundle does not build. Without this, the dev client silently runs its last cached bundle and a proof passes against old code. If you drive Metro some other way, check the bundle yourself.

A proof of a fix should fail against the old code. Put the old file back, run the proof, and confirm the served bundle contains the old code (`curl` the bundle and `grep`). Then restore the fix and run it again.

`./excer feature check` fails when a route belongs to no feature, or when a feature names a route, scenario, endpoint, event or dependency that does not exist. `./excer check` runs it too. When you add a screen, add it to a feature in the same change.

`./excer feature graph` prints a Mermaid graph of features, screens, scenarios, endpoints and events. Add `--format json` or `--format dot` for other formats, and `--focus <id>` to limit it to one feature.
