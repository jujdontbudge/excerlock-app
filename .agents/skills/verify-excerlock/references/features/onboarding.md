---
id: onboarding
title: Onboarding questions and plan preview
routes: [onboarding/[step]]
scenarios: [fresh-install, onboarding-walking-resume, condition-demo-walk-steps, condition-demo-walk-minutes, condition-demo-walk-state-outside, condition-demo-walk-state-treadmill, condition-demo-gym-arrival, condition-demo-gym-presence, condition-demo-gym-minutes]
events: [onboarding_screen_viewed]
depends: [conditions]
---
## Sub-features
- Welcome (the Introduction pager with Get started and Sign in).
- Profile questions `O01`–`O22`, in the order given by `app-next/src/packages/onboarding/lib/flow.ts` `preBranch`.
- The answer-driven branch: walking (`W*`) or gym (`G*`, including `GPlace` for the gym location). The goal and schedule steps show a live lock preview.
- Tail steps `S1`–`S3d`: summary, plan build, trial preview and the reminder (which asks for notifications), then `P`, the paywall.
- The PostHog `onboarding_variant` payload may reorder or drop steps within `preBranch` and `tail`. It never changes the branch.
- Answers persist as they change, and a relaunch resumes on the same step.

## How to get to it (user POV)
Install the app and tap Get started. Every Continue moves to the next `onboarding/<step>`.

## Driving it with excer
Use `./excer demo fresh-install --open /`, then `./excer sim tap "Get started"`. To land on a specific step, open it directly: `./excer sim open /onboarding/O02`.

```proof
name: welcome
scenario: fresh-install
open: /
expect: Block apps. Move more. | Less scrolling. More moving. | Get started
```

```proof
name: resume-walking-goal
scenario: onboarding-walking-resume
open: /
expect: Set your walking goal | Daily step goal | Continue
```

The Condition demo's Continue stays disabled until the goal or state change plays. These scenarios resume at `S3b` with each kind of Condition; the videos and timed button-state evidence are indexed in `.excer/condition-demo-gate/INDEX.md`.

```proof
name: demo-walk-steps-gated
scenario: condition-demo-walk-steps
open: /onboarding/S3b
tap: Continue
expect: Once you hit 10,000 steps | Continue
```

```proof
name: demo-walk-minutes-gated
scenario: condition-demo-walk-minutes
open: /onboarding/S3b
tap: Continue
expect: Once you walk for 20 minutes | Continue
```

```proof
name: demo-walk-state-outside-gated
scenario: condition-demo-walk-state-outside
open: /onboarding/S3b
tap: Continue
expect: Once you start walking | Continue
```

```proof
name: demo-walk-state-treadmill-gated
scenario: condition-demo-walk-state-treadmill
open: /onboarding/S3b
tap: Continue
expect: Once you start walking | Continue
```

```proof
name: demo-gym-arrival-gated
scenario: condition-demo-gym-arrival
open: /onboarding/S3b
tap: Continue
expect: Once you arrive at the gym | Continue
```

```proof
name: demo-gym-presence-gated
scenario: condition-demo-gym-presence
open: /onboarding/S3b
tap: Continue
expect: While you're at the gym | Continue
```

```proof
name: demo-gym-minutes-gated
scenario: condition-demo-gym-minutes
open: /onboarding/S3b
tap: Continue
expect: Once you spend 30 minutes | Continue
```

## Gotchas
- Onboarding imports no real permission, analytics or purchase SDK. Input and output go only through runtime ports, and copy lives in `src/content`.
- The notification ask sits on `S3d`, before the paywall. Every other permission is asked in setup, after the paywall (ADR 0043).
- Step ids are persisted, so renaming one breaks resume for installs already in the field.
