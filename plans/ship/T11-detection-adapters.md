# T11 — Motion, placement, gym, camera adapters and the awake session

Spec: `01-detection-model.md` §1, §3, §4, §7. Facts: `research/conditions-audit.md` §2–§4;
`docs/specs/treadmill-mode.md` (keep everything except the `PROPPED` lease); ledger "Background execution" and
"Sensors & signal processing" sections.

## Steps

1. **`MotionAdapter implements MotionPort`** over `modules/excerlock-motion`: `activity$`, `cadence$`,
   `history(from,to)`; silence → `unknown` after 5 s; authorization status; `NSMotionUsageDescription` present
   (crash otherwise). Step-goal progress from `history(dayStart, now)` on foreground/wake and live cadence
   while awake (B8).
2. **`AwakeSession`** (§3): starts/stops the coarse always-on location session from the enforcement host when
   any rule window contains `now`; requests Always at X3 with the §3 copy; exposes `isAwake`. Only this
   module and the gym geofence registration touch `expo-location`. Denied → Home copy "Open ExcerLock after
   your walk to unlock".
3. **`PlacementAdapter implements PlacementPort`** over `engine/signals/placement` (pickup ~1 s).
4. **Walking state machine** (replaces P2-T15 §2): `inactive → active` on 3 s walking; `active → inactive`
   after stop-grace (single grace; `unknown` counts as not-walking); minutes accrue to `target/minutes`; steps
   to `target/steps`; all timing as persisted timestamps compared on the next alive path — no JS timers across
   suspension (ledger).
5. **Propped machine** (B43): `scanning → propped` on scan pass; `propped → handheld` on pickup (20 s cadence
   grace, exit-grace not applied); `handheld → active`; `active → handoff` on put-down (60 s, exit-grace paused);
   `handoff → scanning` requires the app on screen (shield → open); no lease. Ceremony screen hardening from
   P2-T21 §Treadmill (never close silently; Try again / Continue with phone in hand).
6. **`GymAdapter implements GymPort`**: regions per saved gym via `expo-task-manager`; persist enter/exit
   first; 30 s confirmation settled from timestamps; dwell from region intervals (B31); auto-pause a rule whose
   gym is deleted (B25); ceremony from P2-T21 §Gym.
7. **`GaitVisionPort`** wiring already real; camera permission on first propped start.
8. Day sealing, retention, DST/timezone from P2-T15 §4, §6 unchanged. Delete `WalkingFake` scripts, the
   `900000` constants, `HealthFake`, `demo/gymProgress.ts`; replace fakes with the §7 scenario fixtures.
9. Contract suites: each adapter passes the fake's port suite plus its own fixture tests (existing gait,
   placement and geofence recordings).

## Tests first

- `walkingMachine.test.ts`, `proppedMachine.test.ts`, `gymMachine.test.ts` — every §7 bullet; a
  "background handler contains no setTimeout" grep guard.

## Acceptance (device, `preview` build; recorded with timestamps in `evidence/T11/`)

- [ ] Phone in pocket, ExcerLock backgrounded, Instagram open and shielded: start walking → shield lifts
      within 10 s; stop → shield returns after the grace.
- [ ] Propped on a treadmill: scan → unlocked; switch to Instagram → stays unlocked; pick up and walk →
      stays unlocked; pick up and stand → locked in ≤ 20 s; put down → 60 s → locked.
- [ ] Gym: walk into the radius → unlocked ≤ 60 s; leave → locked; dwell minutes match the visit.
- [ ] Always denied: no background unlock; opening the app after a walk credits steps and unlocks a target rule.
- [ ] Battery: 8 h with a window active costs ≤ 8 % attributable to ExcerLock (Settings › Battery screenshot).
