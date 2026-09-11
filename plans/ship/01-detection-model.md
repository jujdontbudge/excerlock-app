# 01 — Detection model (B41–B44)

Supersedes `01-product-model.md` §3 rules 1 and 3, `docs/specs/treadmill-mode.md` §"State machine" timings,
P2-T14 §1, P2-T15 §2, P2-T16 §2. Everything else in those documents stands.

## 1. The model in one table

There is no lease. Three states with live exits, and one watchdog beneath them.

| State | Enters when | Exits when | Signal |
| --- | --- | --- | --- |
| `walkingActive` | motion says walking for ≥ 3 s continuous | motion says not walking for the stop-grace (user setting, 30 s–5 min, applied **once**) | `MotionPort` |
| `propped` | user starts propped mode in-app **and** the camera scan passes | the phone moves (pickup) → `handheld`; or the app leaves the screen with no scan → stays `propped` until pickup | `PlacementPort`, `GaitVisionPort` |
| `atGym` | geofence entry confirmed for 30 s | geofence exit | `GymPort` |

`handheld` is a transient: after pickup, 20 s to establish cadence; cadence → `walkingActive`; none → locked
(stop-grace does not apply — the phone just left the console). `handoff` is a transient after put-down: 60 s
to re-scan; success → `propped`; the exit-grace countdown is paused during it.

## 2. The watchdog (fail-closed re-lock)

Every detector above runs only while the app process is alive. If iOS kills the app, it crashes, or the user
force-quits, every detector stops at once. The watchdog is the one thing that survives.

- Whenever any unlocked state is entered or renewed, the app registers a DeviceActivity monitor whose
  `intervalDidEnd` action is `blockSelection`, with `intervalEnd = now + WATCHDOG_MS`.
- While alive and still unlocked, the app pushes the deadline forward every `WATCHDOG_RENEW_MS`. Use the
  backdated-`intervalStart` pattern (`docs/research/device-activity-gaps.md` M12) so the future portion is
  short; backdate at least one full increment (`min(now, deadline - increment)`) per the ledger.
- Constants: `WATCHDOG_MS = 15 min` (Apple's floor), `WATCHDOG_RENEW_MS = 5 min`. Tunable, never user-facing,
  never shown in copy.
- On every foreground and every background wake: re-derive the true state from persisted timestamps and the
  motion/visit history, then re-apply shields and re-register the watchdog. Never trust that the OS still
  holds a monitor.
- The watchdog is never the reason a user sees a lock in normal use. If it fires while the app was alive and
  should have renewed, that is a bug, and Sentry gets a breadcrumb.

## 3. Staying awake (B42)

- `UIBackgroundModes: [location, fetch]`. A `CLLocationManager` with `allowsBackgroundLocationUpdates = true`,
  `desiredAccuracy = kCLLocationAccuracyThreeKilometers`, `distanceFilter = 500`, `pausesLocationUpdatesAutomatically = false`,
  `showsBackgroundLocationIndicator = true`, started whenever **any enabled rule has a window instance
  containing `now`** and stopped otherwise. The location data is not used for walking; the session exists to
  keep the process alive so `MotionPort` keeps delivering.
- Requested from every user at setup X3 with the copy: *"ExcerLock keeps watching for movement while your apps
  are locked — that's the only way they can unlock the moment you start walking. It uses your location only to
  stay awake and to notice when you arrive at your gym."* Denied → walking unlocks only when the app is
  opened (pedometer history backfill); say so on the Home card: *"Open ExcerLock after your walk to unlock."*
- Force-quit stops everything until the next open. The watchdog covers the lock side; nothing covers the
  unlock side, and nothing can. Don't promise otherwise in copy.

## 4. Signals and thresholds

**`MotionPort`** (over `modules/excerlock-motion`, ported from `app/`): `activity$` stream of
`{ type: 'walking'|'running'|'stationary'|'automotive'|'cycling'|'unknown', confidence, at }` from
`CMMotionActivityManager`; `cadence$` from `CMPedometer` live updates; `history(from, to)` from the historical
queries. "Walking" for the model = `walking|running` with confidence ≥ medium **or** cadence ≥ 80 steps/min,
sustained 3 s. "Not walking" = neither for the stop-grace. Ledger rule: a push-driven detector keeps its last
verdict when the sensor goes quiet — so the adapter must emit `unknown` after 5 s of silence and the model
treats `unknown` as not-walking for grace purposes.

**`PlacementPort`** (over `engine/signals/placement`, ported): `placement$` of `propped|handheld|unknown` from
device-motion micro-tremor + gravity vector; pickup within ~1 s. Device-verified constants come across with
the module; do not retune without a device run.

**`GaitVisionPort`** (already in `app-next/modules/excerlock-gait-vision`): foreground-only camera scan,
adaptive with a 5 s cap, Vision pose + periodicity detector. Never auto-started; only from the propped-mode
button. Camera permission asked on first use, never at onboarding.

**`GymPort`** (over `expo-location` regions + `expo-task-manager`): `CLCircularRegion` per saved gym
(≤ 5 saved, radius 50–200 m from the picker), `enter`/`exit` events persisted **first** with a timestamp, 30 s
confirmation settled by comparing persisted timestamps on the next alive path (never a JS timer — ledger).
Dwell = enter-to-exit interval from the region timestamps (B31).

**Manual check button (B44):** the orange button on the walking card. Tap → observe `MotionPort` for exactly
3 s → walking → state on, button reads "Detected"; not walking → button reads "Not detected — hold your phone
and walk", state unchanged. No sheet, no modal, no progress. It is a fallback for when the background session
is not running (denied Always, force-quit); the card explains this only in the denied case.

## 5. `LockDecision` (replaces `01-product-model.md` §3 type)

```ts
type LockDecision =
  | { state: 'noRulesToday';  nextLockAt: string | null }
  | { state: 'beforeWindow';  nextLockAt: string; ruleId: string; getAheadRuleId: string | null }
  | { state: 'locked';        activeRuleIds: string[]; nextUnlockHint: UnlockHint }
  | { state: 'unlockedMet';   byRuleId: string; byName: string; metAt: string; relockAt: string | null }
  | { state: 'unlockedWalking'; ruleId: string; since: string }               // walkingActive (no leaseUntil)
  | { state: 'unlockedPropped'; ruleId: string; since: string }               // propped, camera-verified
  | { state: 'unlockedAtGym';  ruleId: string; placeId: string; since: string } // was unlockedProvisional
  | { state: 'afterWindow';   nextLockAt: string | null };
```

Inputs: `rules`, `ruleDays`, `earnedUnlocks`, `detection: { walking: 'active'|'inactive'|'unknown', since }`,
`placement: 'propped'|'handheld'|'unknown'`, `gymPresence`, `now`, `timezone`. `walkingSession` and
`leaseUntil` are deleted from every type, fixture and scenario.

## 6. Precedence (the only statement; task files cite it)

1. **Earned unlock wins.** `EarnedUnlock` for today → `unlockedMet` (B23 unchanged).
2. **Live state wins next.** If a `state` walking rule is enabled with a window instance containing `now`:
   `detection.walking === 'active'` → `unlockedWalking`; else `placement === 'propped'` and the propped
   session is verified → `unlockedPropped`. A `target` walking rule never reaches this branch: walking toward
   a goal does not open the apps, reaching it does. `walkingActive` also accrues minutes toward a
   `target/minutes` rule and steps toward a `target/steps` rule.
3. **Gym presence.** Enabled gym rule, window contains `now`, `gymPresence` confirmed → `unlockedAtGym`
   (B22). `event` rule books met at confirmation; `minutes` rule holds while present and books met at goal.
4. **Locked**, **before window**, **after window / no rules** — unchanged.

## 7. Scenarios that must exist as tests and dev-menu fixtures

- Walk 3 s → unlocked; stop 20 s (grace 30 s) → still unlocked; stop 31 s → locked.
- Walk, app backgrounded (session running) → unlock within 10 s of first step on device.
- Walk, Always denied, app closed → locked until open; on open, history backfill credits steps and, for a
  target rule, books met.
- Propped: scan passes → `unlockedPropped`; user switches to Instagram → still unlocked; picks phone up →
  `handheld`; walks → `unlockedWalking`; picks up and stands still 20 s → locked.
- Propped, put down → `handoff` 60 s → no scan → locked; exit-grace paused during handoff (ledger: two graces
  never compose).
- Force-quit while `unlockedWalking` → watchdog re-locks within `WATCHDOG_MS` + 2 min jitter.
- Gym: enter → 30 s → `unlockedAtGym`; leave → locked; app force-quit during the visit → geofence relaunch
  still ends it; dwell credited from region timestamps.
- Clock rewind does not revive any state (watermark unchanged).
- Sensor silence 5 s → `unknown` → grace starts.
