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
- The walk keep-alive uses Always location with no blue indicator (ADR 0036), and the raw motion stream corroborates Apple's walking legs (ADR 0041).
- Treadmill scan: the phone is propped facing the user, and the camera gait detector verifies walking, followed by the square lock ceremony.
- Walking target: steps or minutes from Motion & Fitness accrue Progress on Home.

## How to get to it (user POV)
Home → "Check walking" or "I'm using a treadmill" on a walking-state condition.

## Driving it with excer
Run `./excer demo unlock-treadmill-scan --open /unlock/treadmill?ruleId=walk`. The simulator has no camera, so the focused proofs use a steady walking bob or incident-sized standing face jitter.

```proof
name: treadmill-screen
scenario: unlock-treadmill-scan
open: /unlock/treadmill?ruleId=walk
expect: Prop your phone and walk | I'm walking
```

```proof
name: walking-state-home
scenario: home-walking-session
open: /home
expect: Unlock while walking | Check walking | I'm using a treadmill
```

```proof
name: treadmill-still-empty
scenario: unlock-treadmill-framing
open: /unlock/treadmill?ruleId=walk
expect: Scan progress 0 percent | Prop your phone and walk
absent: Walking detected | Screen Time unlocked! | Done
absent-wait: 31
then-open: /dev?lab=treadmill
then-expect: Propped access inactive | Apps locked
```

```proof
name: treadmill-walking-pass
scenario: unlock-treadmill-scan
open: /unlock/treadmill?ruleId=walk
expect: Screen Time unlocked! | Done
wait: 18
then-open: /dev?lab=treadmill
then-expect: Propped access active | Watchdog ends within 15 minutes of pass
```

```proof
name: treadmill-limit-warning
scenario: unlock-treadmill-scan
open: /unlock/treadmill?ruleId=walk
expect: Done
wait: 18
then-actions: tap Done | open /dev?advance=870000 | wait 3 | open /dev?lab=treadmill | expect Propped access active | expect Warning scheduled 30 seconds before expiry | expect Warning fired | open /dev?advance=30000 | wait 2 | open /dev?lab=treadmill
then-expect: Propped access inactive | Apps locked | Warning fired
```

```proof
name: treadmill-background-resume
scenario: unlock-treadmill-scan
open: /unlock/treadmill?ruleId=walk
open-wait: 0.5
actions: wait 3 | background app | wait 8 | resume app | expect Scan progress 0 percent
expect: Screen Time unlocked! | Done
wait: 18
then-open: /dev?lab=treadmill
then-expect: Propped access active
```

```proof
name: treadmill-cancel-rescan
scenario: unlock-treadmill-scan
open: /unlock/treadmill?ruleId=walk
open-wait: 1.5
actions: wait 3 | tap Close unlock screen | open /dev?lab=treadmill | expect Propped access inactive | wait 8 | expect Propped access inactive | open /unlock/treadmill?ruleId=walk | expect Scan progress 0 percent
expect: Screen Time unlocked! | Done
wait: 18
```

## Gotchas
- The simulator cannot prove real motion, camera framing or background keep-alive. Those need a physical iPhone (ticket #113), so say so in reports.
- Pass `?ruleId=walk` when opening the scenario's treadmill Condition. A scan needs an enabled Walking state Condition.
- The research recorders (`tools/phone-*-recorder`, Linked Recorder) share detection code but never ship (ADRs 0026–0028, `excer check` `research-isolation`).
