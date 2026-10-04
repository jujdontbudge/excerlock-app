---
id: gym
title: Gym conditions, picker and check-in
routes: [unlock/gym, gym-picker, settings/gyms]
scenarios: [gym-uiuc-uncertain, gym-uiuc-progress, gym-uiuc-background, gym-uiuc-outside, gym-uiuc-manual, gym-arrival-user, gym-time-user, unlock-gym-inside, unlock-gym-outside, unlock-gym-lost, unlock-gym-reduced]
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

```proof
name: unlock-map-circle-line
actions: location 40.1095,-88.2272
scenario: gym-uiuc-outside
open: /unlock/gym?ruleId=gym
expect: 1130 ft to UIUC gym | Center on me | Center on gym
wait: 20
```


```proof
name: picker-phone-location
actions: location 40.1095,-88.2272
scenario: trial-active
open: /gym-picker
expect: Urbana IL 61801 | Save gym
wait: 20
```

Gym proofs use the owned simulator's real Expo Location fix at UIUC. Their location actions keep each proof independent. The map proof's frame must show the whole circle, its pin, the user point and the orange dashed line. Distances use Settings units (the UIUC scenarios use miles).

```proof
name: manual-inside-auto-off
scenario: gym-uiuc-manual
open: /unlock/gym?ruleId=gym
actions: location 40.1095,-88.2272 | tap I'm at the gym | expect Confirming you're here | expect Done | open /dev
expect: Gym visits 1 · confirmed · background off
wait: 60
```

```proof
name: outside-distance-message
scenario: gym-uiuc-outside
open: /unlock/gym?ruleId=gym
actions: location 40.1095,-88.2272 | tap I'm at the gym
expect: You're 1130 ft from UIUC gym
wait: 15
```

```proof
name: uncertain-fix-retry
scenario: gym-uiuc-uncertain
open: /unlock/gym?ruleId=gym
actions: location 40.1095,-88.2272 | tap I'm at the gym | expect Getting a better fix…
expect: Location isn't precise enough yet. Try again near the gym.
wait: 15
```

```proof
name: arrival-while-open
scenario: gym-uiuc-manual
open: /unlock/gym?ruleId=gym
actions: location 40.1135,-88.2272 | expect Not at your gym yet | location 40.1095,-88.2272
expect: Location detected at the gym | You're at UIUC gym.
wait: 20
```

```proof
name: restart-mid-visit-progress
scenario: gym-uiuc-progress
open: /unlock/gym?ruleId=gym
actions: location 40.1095,-88.2272 | tap I'm at the gym | expect Done | open /dev?advance=60000 | open /dev
expect: Gym visits 1 · confirmed · background off | Gym progress 1 min
relaunch-after-expect: true
after-relaunch-expect: Gym visits 1 · confirmed · background off | Gym progress 1 min
wait: 60
```

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
expect: Search | Search for a gym or address | Use my current location | Gyms near you
```

## Gotchas
- Legacy Chicago scenarios such as `unlock-gym-inside` say "Not at your gym yet" unless the simulator location is set inside the gym, because the iOS dev runtime swaps in real foreground location.
- Presence confirmation is one app-fixed 30 s constant, `PRESENCE_CONFIRM_MS` in `activity/presence.ts` (PRD §3.7, decided 2026-07-28). Background geofence arrivals (`gymMachine`), the Home presence sync and the check-in ceremony all use it; do not add a second timing.
- A stale binary reports search as unavailable. Native search changes need a new dev build.

- `manual-inside-auto-off` captures confirmation before waiting for Done, then reads the durable visit projection with auto-detect off. It never uses preview mode.
- `uncertain-fix-retry` changes only the fake adapter's accuracy; the production fix policy and retry path decide the result.
- `restart-mid-visit-progress` establishes a confirmed target visit and one minute of Progress before killing the process. The same log and reducer recover it after launch; current presence is re-read.
