---
id: walking
title: Walking detection and treadmill unlock
routes: [unlock/treadmill]
scenarios: [home-walking-session, walk-state-ready, unlock-treadmill-scan, unlock-treadmill-stop, unlock-treadmill-framing, unlock-treadmill-denied, unlock-treadmill-reduced]
events: [unlock_screen_opened, treadmill_scan_started, treadmill_scan_verified, treadmill_scan_failed, unlock_ceremony_done]
depends: [conditions, enforcement]
---
## Sub-features
- Walking state ("Unlock while walking"): apps open only while motion evidence says the user is walking. That evidence is three seconds of qualification plus a one-shot stop grace, and Placement (handheld or propped) is part of it.
- The walk keep-alive uses Always location at 100 m with no distance filter and no blue indicator (ADR 0036, 0073), and the raw motion stream corroborates Apple's walking legs (ADR 0041).
- Treadmill scan: the phone is propped facing the user, and the camera gait detector verifies walking, followed by the square lock ceremony. It keeps observing while open and revokes qualification when walking stops.
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
expect: Screen Time unlocked! | Keep this screen open | Stop treadmill scan
wait: 15
then-tap: Stop treadmill scan
then-open: /home
then-expect: Check walking
```

```proof
name: treadmill-stop-relocks
scenario: unlock-treadmill-stop
open: /unlock/treadmill?ruleId=walk
actions: expect Screen Time unlocked! | expect Stop treadmill scan | expect Prop your phone and walk
expect: Prop your phone and walk | I'm walking
absent: Screen Time unlocked! | Stop treadmill scan
wait: 25
then-open: /home
then-expect: Check walking
```

```proof
name: walking-state-home
scenario: home-walking-session
open: /home
expect: Unlock while walking | Check walking | I'm using a treadmill
```

## Gotchas
- The scan combines vertical steps and lateral strides, with a half-second acquisition hold. Qualification continues while the screen is open and is revoked by stopped/stale evidence, closing or backgrounding. Slow lateral evidence may require eight seconds. The positive proof also closes the scan and checks that walking must qualify again. Clip replay is not physical Screen Time enforcement evidence.
- The simulator cannot prove real motion, camera framing or background keep-alive. Those need a physical iPhone (ticket #113), so say so in reports.
- Supply `?ruleId=walk` to reach the scenario’s walking Condition. The stationary-face proof combines a constant synthetic face with the historical moving torso fixture: it proves that an unassociated background body cannot qualify. The positive fixture explicitly models associated shoulders; it does not prove build 17 face sensitivity.
- The research recorders (`tools/phone-*-recorder`, Linked Recorder) share detection code but never ship (ADRs 0026–0028, `excer check` `research-isolation`).

The stop proof freezes the associated walking landmarks after 16 seconds while continuing to emit fresh samples. It requires the unlocked screen first, then the scanning screen and a Home Lock decision that requires walking again. The walking fake alternates forward and reverse playback of its existing fixture without a position jump so proof capture is not racing its old nine-second end-of-stream.
