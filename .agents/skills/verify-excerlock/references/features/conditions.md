---
id: conditions
title: Conditions and the builder
routes: [(tabs)/conditions, builder]
scenarios: [home-unlocked-met, multi-rule-overlap, window-crosses-midnight, home-no-rules]
events: [walk_places_updated]
depends: [setup]
---
## Sub-features
- The Conditions tab lists the newest first, with pause, edit and delete under "More actions".
- The builder at `/builder` reuses the onboarding activity, branch, schedule and summary screens. Condition kinds are Walking target (steps or minutes), Walking state, Gym target (minutes) and Gym presence (arrival).
- Schedules cover days plus an all-day or start–end window. A window may cross midnight.
- Only Save writes. Cancel asks for confirmation when there are unsaved edits. Saving a Condition that needs something new opens `/permissions/<step>`.

## How to get to it (user POV)
Conditions tab → Add condition, or More actions on an existing condition.

## Driving it with excer
`./excer demo home-unlocked-met --open /conditions`, then `./excer sim tap "Add condition"`, or open `/builder` directly.

```proof
name: list
scenario: home-unlocked-met
open: /conditions
expect: Conditions | Add condition | Walk 5,000 steps
```

```proof
name: builder-first-step
scenario: home-unlocked-met
open: /builder
expect: What exercise do you want to do more of? | Walking | Gym
```

```proof
name: builder-walk-places
scenario: trial-active
open: /builder
tap: Walking | Continue | Inside | Treadmill
expect: Where do you walk? | (Select all that apply) | Outside | Inside | Treadmill
```

```proof
name: builder-back-from-plan
scenario: trial-active
open: /builder
actions: tap Walking | tap Continue | tap Continue | tap Continue | tap Continue | tap Continue | expect Your plan is ready | tap Back
expect: When should blocking be active?
absent: Discard changes?
```

```proof
name: builder-walking-goal-field
scenario: trial-active
open: /builder
tap: Walking | Continue | Continue | Reach a step goal | Continue
expect: Set your walking goal | Daily step goal | steps
```

```proof
name: builder-schedule-dial
scenario: trial-active
open: /builder
tap: Walking | Continue | Continue | Reach a step goal | Continue | Continue
expect: When should blocking be active? | 12 hr | Continue
```

## Gotchas
- Stored keys still say `rule` (`rulesStore`, `ruleDays`). That is a persisted invariant. Use "Condition" everywhere else.
- Running and biking were removed (B38). Do not bring them back through old copy or scenarios.
- Relabelling units does not convert saved distance goals (see settings).
