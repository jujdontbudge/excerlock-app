---
id: gym
title: Gym conditions, picker and check-in
routes: [unlock/gym, gym-picker, settings/gyms]
scenarios: [gym-arrival-user, gym-time-user, unlock-gym-inside, unlock-gym-outside, unlock-gym-lost, unlock-gym-reduced]
events: [gym_unlock_tapped, gym_unlock_checked, gym_unlock_confirmed, gym_unlock_lost]
depends: [conditions, home]
---
## Sub-features
- The gym picker (`/gym-picker`): an Apple map, worldwide MapKit search, a 50–200 m radius, and up to five saved gyms. It is shared by setup, the builder and Settings → Gyms.
- The gym unlock ceremony (`/unlock/gym`): a cancellable 30-second presence confirmation that books a Check-in only if presence holds, followed by confetti.
- Gym target (minutes at the gym) and Gym presence (arrival).

## How to get to it (user POV)
Home → "I'm at the gym". Settings → Privacy & permissions → saved gyms. Setup's gym step.

## Driving it with excer
Gym presence uses the simulator's real location on iOS. To stand inside the demo gym, run `xcrun simctl location <udid> set 41.884,-87.652` (West Loop Fitness, 100 m radius).

```proof
name: arrival-condition-home
scenario: gym-arrival-user
open: /home
expect: Arrive at the gym | I'm at the gym
```

```proof
name: picker
scenario: trial-active
open: /gym-picker
expect: Pick your gym | Search for a gym or address | Arrival radius | Save gym
```

```proof
name: search-field
scenario: trial-active
open: /gym-picker
tap: Search for a gym or address
expect: Search | Search for a gym or address | Find gyms near me
```

## Gotchas
- `unlock-gym-inside` says "Location not at gym" unless the simulator location is set inside the gym, because the iOS dev runtime swaps in real foreground location.
- Presence confirmation is one app-fixed 30 s constant, `PRESENCE_CONFIRM_MS` in `activity/presence.ts` (PRD §3.7, decided 2026-07-28). Background geofence arrivals (`gymMachine`), the Home presence sync and the check-in ceremony all use it; do not add a second timing.
- A stale binary reports search as unavailable. Native search changes need a new dev build.
