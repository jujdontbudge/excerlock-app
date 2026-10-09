---
id: walking
title: Walking detection and treadmill unlock
routes: [unlock/treadmill]
scenarios: [home-walking-session, walk-state-ready, unlock-treadmill-scan, unlock-treadmill-framing, unlock-treadmill-denied, unlock-treadmill-reduced]
events: [unlock_screen_opened, treadmill_scan_started, treadmill_scan_verified, treadmill_scan_failed, unlock_ceremony_done]
depends: [conditions, enforcement]
---
## Sub-features
- Walking state ("Unlock while walking"): apps open only while motion evidence says the user is walking. That evidence is three seconds of qualification plus a one-shot stop grace, and Placement (handheld or propped) is part of it.
- The walk keep-alive uses Always location at 100 m with no distance filter and no blue indicator (ADR 0036, 0073), and the raw motion stream corroborates Apple's walking legs (ADR 0041).
- Treadmill scan: the phone is propped facing the user, and the camera gait detector verifies walking, followed by the square lock ceremony.
- Walking target: steps or minutes from Motion & Fitness accrue Progress on Home.

## How to get to it (user POV)
Home → "Check walking" or "I'm using a treadmill" on a walking-state condition.

## Driving it with excer
Run `./excer demo unlock-treadmill-scan --open /unlock/treadmill`. The simulator has no camera, so it replays recorded gait fixtures.

```proof
name: treadmill-screen
scenario: unlock-treadmill-scan
open: /unlock/treadmill
expect: Prop your phone and walk | I'm walking
```

```proof
name: walking-state-home
scenario: home-walking-session
open: /home
expect: Unlock while walking | Check walking | I'm using a treadmill
```

## Gotchas
- The simulator cannot prove real motion, camera framing or background keep-alive. Those need a physical iPhone (ticket #113), so say so in reports.
- `unlock-treadmill-scan` currently shows "Choose a treadmill walking condition first." That is an open question about the scenario's condition.
- The research recorders (`tools/phone-*-recorder`, Linked Recorder) share detection code but never ship (ADRs 0026–0028, `excer check` `research-isolation`).
