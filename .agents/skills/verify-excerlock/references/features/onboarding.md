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
- Research `S4` and rating `S5` immediately follow Import on `S3`, before the Condition demo `S3b`. Rating asks for the review prompt one second into every visit and keeps Continue locked until that request finishes; demo `--prompt ask` forwards to the real StoreKit prompt.
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
expect: HACK your brain to hit your fitness goals | Get started
```

```proof
name: resume-walking-goal
scenario: onboarding-walking-resume
open: /
expect: Set your walking goal | Daily step goal | Continue
```

```proof
name: body-goals-select-all
scenario: fresh-install
open: /onboarding/O22
expect: What are your body goals? | Select all that apply | Gain muscle | Lose fat | Maintain
```

- S1 fits on one screen and does not scroll. The dial shrinks to the space left, down to 80% of its full size; below that (small phones, large text) the page scrolls. A drag that starts on the dial's ring never scrolls the page.

```proof
name: schedule-dial
scenario: fresh-install
open: /onboarding/S1
expect: When should blocking be active? | Start at: 9 AM | End at: 9 PM | 12 hr | Continue
```

- After body goals, "What are you struggling with?" lists only the goals picked, as select all that apply, and continues with none selected. The answer (`struggles`) is not used elsewhere.

```proof
name: struggles-picked-goals
scenario: fresh-install
open: /onboarding/O22
tap: Gain muscle | Lose fat | Continue
expect: What are you struggling with? | Select all that apply | Gaining muscle | Losing fat | Continue
absent: Maintaining my weight
```

```proof
name: muscle-target-ruler
scenario: fresh-install
open: /onboarding/O22
tap: Gain muscle | Continue | Continue
expect: How many pounds of muscle do you want to gain? | 10.0 lb | Continue
```

```proof
name: fat-target-ruler
scenario: fresh-install
open: /onboarding/O22
tap: Lose fat | Continue | Continue
expect: How many pounds of fat do you want to lose? | 15.0 lb | Continue
```

```proof
name: both-body-targets
scenario: fresh-install
open: /onboarding/O22
actions: tap Gain muscle | tap Lose fat | tap Continue | tap Continue | tap Continue | expect How many pounds of fat do you want to lose? | open /onboarding/S3 | tap Add another Condition | tap Gym | tap Continue | tap Continue | tap Continue
expect: Projected results | Gain 10.0 lb of muscle | Lose 15.0 lb of fat | 150% more steps | 150% more time at the gym
```

```proof
name: projected-results
scenario: fresh-install
open: /onboarding/S3
expect: Projected results | 150% more steps | 50% less screen time
```

- Projected results can add more Conditions. "How it will look" introduces the Condition cards, then the centred "Projected results" heading introduces selected muscle-gain and fat-loss targets in pounds before the activity and screen-time results. "Add another Condition" runs the Condition builder without its gym-location and review steps; its close button returns to Projected results. Each added Condition shows as another card with a remove button, the stats cover every activity, and Import saves all of them after admission. The Condition demo shows only the first.

```proof
name: add-another-condition
scenario: fresh-install
open: /onboarding/S3
tap: Add another Condition | Gym | Continue | Continue | Continue
expect: Projected results | Your apps are blocked unless you are at the gym from 9 AM to 9 PM on weekdays | 150% more steps | 150% more time at the gym | 50% less screen time | Add another Condition
```

```proof
name: add-condition-close
scenario: fresh-install
open: /onboarding/S3
tap: Add another Condition | Close
expect: Projected results | Add another Condition | Import
absent: Remove Condition
```

```proof
name: plan-staged-before-admission
scenario: fresh-install
open: /onboarding/S3
tap: Import
expect: ExcerLock is built on research to HACK your brain | Continue
then-open: /dev
then-expect: Conditions | 0 | Onboarding plan | Staged
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

The haptic proof watches the demo from its beginning; taps on the inert promise caption pace the proof.

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
open: /onboarding/S3b
tap: Once you hit 10,000 steps | Once you hit 10,000 steps | Once you hit 10,000 steps
expect: Once you hit 10,000 steps | Continue
then-open: /dev
then-expect: Haptics log | Haptic unlock | Haptic lock
```

The Condition demo's Continue stays disabled until the goal or state change plays, which takes under three seconds for every Condition. These scenarios resume at `S3b` with each kind of Condition; the videos and timed button-state evidence are indexed in `.excer/demo-3s/index.md`.

```proof
name: demo-walk-steps-gated
scenario: condition-demo-walk-steps
open: /onboarding/S3b
open-wait: 0.5
tap: Continue
expect: Once you hit 10,000 steps | Continue
then-tap: Continue
then-expect: We want you to try ExcerLock Premium for free
```

```proof
name: demo-walk-minutes-gated
scenario: condition-demo-walk-minutes
open: /onboarding/S3b
open-wait: 0.5
tap: Continue
expect: Once you walk for 20 minutes | Continue
then-tap: Continue
then-expect: We want you to try ExcerLock Premium for free
```

```proof
name: demo-walk-state-outside-gated
scenario: condition-demo-walk-state-outside
open: /onboarding/S3b
open-wait: 0.5
tap: Continue
expect: Once you start walking | Continue
then-tap: Continue
then-expect: We want you to try ExcerLock Premium for free
```

```proof
name: demo-walk-state-treadmill-gated
scenario: condition-demo-walk-state-treadmill
open: /onboarding/S3b
open-wait: 0.5
tap: Continue
expect: Once you start walking | Continue
then-tap: Continue
then-expect: We want you to try ExcerLock Premium for free
```

```proof
name: demo-gym-arrival-gated
scenario: condition-demo-gym-arrival
open: /onboarding/S3b
open-wait: 0.5
tap: Continue
expect: Once you arrive at the gym | Continue
then-tap: Continue
then-expect: We want you to try ExcerLock Premium for free
```

```proof
name: demo-gym-presence-gated
scenario: condition-demo-gym-presence
open: /onboarding/S3b
open-wait: 0.5
tap: Continue
expect: While you're at the gym | Continue
then-tap: Continue
then-expect: We want you to try ExcerLock Premium for free
```

```proof
name: demo-gym-minutes-gated
scenario: condition-demo-gym-minutes
open: /onboarding/S3b
open-wait: 0.5
tap: Continue
expect: Once you spend 30 minutes | Continue
then-tap: Continue
then-expect: We want you to try ExcerLock Premium for free
```

```proof
name: research-after-import
scenario: fresh-install
open: /onboarding/S3
tap: Import
expect: ExcerLock is built on research | HACK | University of Oxford | Harvard University | University of Cambridge | No shame, no punishment | Continue
then-tap: Continue
then-expect: Give us a rating | 50K+ ExcerLock users | ExcerLock was made for
```

```proof
name: rating-back-reentry
scenario: fresh-install
open: /onboarding/S4
tap: Continue | Back | Continue
expect: Give us a rating | 4.7 | 50K+ ExcerLock users | Maya | Daniel
then-open: /dev
then-expect: rating | research
```

## Gotchas
- The native rating sheet needs StoreKit services: use `simslim --except family,store` for this proof device. Demo `--prompt ask` forwards to the native port, while default demo proofs use its logged fake. StoreKit exposes no accessibility labels here; screenshot the real sheet. Submit is disabled in a development build.
- The install-scoped rating gate survives scenario resets and account changes. Re-entry must not request again; inspect the dev analytics log for one `review_requested`.
- Onboarding imports no real permission, analytics or purchase SDK. Input and output go only through runtime ports, and copy lives in `src/content`.
- The notification ask sits on `S3d`, before the paywall. Every other permission is asked in setup, after the paywall (ADR 0043).
- Step ids are persisted, so renaming one breaks resume for installs already in the field.
