---
id: home
title: Home and the Lock decision
routes: [(tabs)/home]
scenarios: [home-locked-walking, home-unlocked-met, home-before-window, home-no-rules, multi-rule-overlap, window-crosses-midnight]
events: [gym_presence_auto_started, gym_presence_auto_confirmed, gym_presence_ended]
depends: [conditions, walking, gym, enforcement, setup]
---
## Sub-features
- A greeting, the streak, and the orange lock card showing the Lock decision (Locked or Unlocked), the relevant Condition's schedule, and live Progress bars.
- Condition actions: "I'm at the gym" (gym), "Check walking" and "I'm using a treadmill" (walking state).
- The Setup reminder card when a Setup need is open.
- The app-level gym presence engine (`home/gymPresenceSync`) auto-confirms an arrival with the same 30-second check as the manual route.
- The lock list and analytics shortcuts.

## How to get to it (user POV)
It is the first tab. It is also where a subscriber lands after setup.

## Driving it with excer
Run `./excer demo <scenario> --open /home`. The capture-only links `/home?steps=5000` and `/home?advance=3600000` add steps and advance the clock on the live instance.

```proof
name: goal-met-unlocked
scenario: home-locked-walking
open: /home
expect: Unlocked | Walk 5,000 steps | 15,000 / 5,000 steps
```

```proof
name: goal-open-locked
scenario: trial-active
open: /home
expect: Locked | 3,200 / 5,000 steps
```

Home plays the unlock haptic once, for a new unlock seen while Home is focused and settled. In the real runtime that means a shield lift the native layer acknowledged (`RuntimeStatusSnapshot.shieldLifts`). The demo runtime has no shields, so it follows the Lock decision instead.

```proof
name: goal-transition-haptic
scenario: trial-active
open: /
tap: Sign in | Continue with Apple
expect: Locked | 3,200 / 5,000 steps
then-open: /home?steps=5000&stepsAfter=2000
then-expect: Unlocked | 5,000 / 5,000 steps
```

After this proof, open `/dev` and capture “Haptics log” with `Haptic unlock`. This is demo Lock decision evidence; it does not establish a real native shield lift.

To see it, load `trial-active`, sign in from Welcome, and open `/home?steps=5000&stepsAfter=2000`, then read the dev menu's "Haptics log". The optional `stepsAfter` waits up to five seconds before applying fake sensor Progress. Opening a deep link can remount Home, so an immediate update is correctly silent during the mount settling window.

## Gotchas
- `home-locked-walking` shows **Unlocked**: its 15,000 steps meet the 5,000 goal. `trial-active` is the one with an open goal.
- A step or minute target accrues Progress but never opens apps before the goal is met. Only the walking state opens them live.
- Gym presence runs only while the app is open. Background geofencing is not built.
- `DetectionService` at the runtime root owns walking evidence. Home never runs a second policy engine.
