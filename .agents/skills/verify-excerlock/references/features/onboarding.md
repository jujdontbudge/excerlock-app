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
- Profile questions `O01`–`O24`, in the order given by `app-next/src/packages/onboarding/lib/flow.ts` `preBranch`. `O23` and `O24` ask for a target in pounds only when the corresponding body goal was chosen.
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

```proof
name: muscle-target-ruler
scenario: fresh-install
open: /onboarding/O22
tap: Gain muscle | Continue
expect: How many pounds of muscle do you want to gain? | 10.0 lb | Continue
```

```proof
name: fat-target-ruler
scenario: fresh-install
open: /onboarding/O22
tap: Lose fat | Continue
expect: How many pounds of fat do you want to lose? | 15.0 lb | Continue
```

```proof
name: both-body-targets
scenario: fresh-install
open: /onboarding/O22
tap: Gain muscle | Lose fat | Continue | Continue
expect: How many pounds of fat do you want to lose? | 15.0 lb | Continue
then-open: /onboarding/S3
then-expect: Projected results | Gain 10.0 lb of muscle | Lose 15.0 lb of fat
```

```proof
name: projected-results
scenario: fresh-install
open: /onboarding/S3
expect: Projected results | 150% more steps | 50% less screen time
```

```proof
name: trial-preview-back
scenario: fresh-install
open: /onboarding/S3c
expect: Back | We want you to try ExcerLock Premium for free | Try for $0.00
```

```proof
name: trial-preview-back-action
scenario: fresh-install
open: /onboarding/S3c
tap: Back
expect: Once you hit 10,000 steps, your apps will unlock. | Continue
```

```proof
name: walking-minutes-entry
scenario: onboarding-walking-resume
open: /onboarding/W2
tap: Walk for a set time | Continue
expect: Set your walking goal | Daily walking time | minutes
```

```proof
name: profile-name-entry
scenario: fresh-install
open: /onboarding/O04
expect: What should we call you? | First name
```

Haptics follow the flow's events, and the dev menu's "Haptics log" is the simulator's evidence:
- A choice changing sends `select`. Continue sends `tap`, or `commit` when the plan is saved on S3.
- The impact story (O11 to O14) and O15 play one `beat` each.
- The loop story plays `lock` on O17 and `success` on O18.
- S2 ticks each task, then the "Plan created" badge plays `success`.
- The Condition demo plays lock, progress detents and unlock once per entry, never on its auto-loop.

`demoTime` starts the demo near its unlock; the taps on the inert promise caption only pace the proof.

```proof
name: choice-select-haptic
scenario: fresh-install
open: /onboarding/O22
tap: Gain muscle
expect: Gain muscle | Continue
then-open: /dev
then-expect: Haptics log | Haptic select
```

```proof
name: plan-commit-haptic
scenario: fresh-install
open: /onboarding/S3
tap: Import
expect: Once you hit 10,000 steps
then-open: /dev
then-expect: Haptics log | Haptic commit
```

```proof
name: demo-unlock-haptic
scenario: condition-demo-walk-steps
open: /onboarding/S3b?demoTime=5
tap: Once you hit 10,000 steps | Once you hit 10,000 steps | Once you hit 10,000 steps
expect: Once you hit 10,000 steps | Continue
then-open: /dev
then-expect: Haptics log | Haptic unlock | Haptic lock
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
