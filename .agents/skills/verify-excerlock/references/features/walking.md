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
open: /unlock/treadmill?ruleId=walk
expect: Prop your phone and walk | I'm walking
```

```proof
name: treadmill-stationary-face
scenario: unlock-treadmill-framing
open: /unlock/treadmill?ruleId=walk
open-wait: 12
expect: Prop your phone and walk | I'm walking
absent: Walking detected | Screen Time unlocked!
```

```proof
name: treadmill-windowed-pass
scenario: unlock-treadmill-scan
open: /unlock/treadmill?ruleId=walk
expect: Screen Time unlocked!
wait: 15
```

```proof
name: walking-state-home
scenario: home-walking-session
open: /home
expect: Unlock while walking | Check walking | I'm using a treadmill
```

## Gotchas
- The windowed scan requires four seconds of coverage, three complete cycles and another half-second of qualifying windows. Detector results can fall back to not-walking on later samples; the screen still performs a one-shot scan and stops the camera on success. Continuous replay release is not an app relock proof.
- The simulator cannot prove real motion, camera framing or background keep-alive. Those need a physical iPhone (ticket #113), so say so in reports.
- Supply `?ruleId=walk` to reach the scenario’s walking Condition. The stationary-face proof combines a constant synthetic face with the historical moving torso fixture: it proves that an unassociated background body cannot qualify. The positive fixture explicitly models associated shoulders; it does not prove build 17 face sensitivity.
- The research recorders (`tools/phone-*-recorder`, Linked Recorder) share detection code but never ship (ADRs 0026–0028, `excer check` `research-isolation`).
