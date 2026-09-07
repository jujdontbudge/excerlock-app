# Old-app feature inventory (`/Users/johansardar/ExcerLock/app`)

Read-only audit, 2026-09-07. Every claim below is anchored to a file and line I opened.
Where I say "absent", I name the directory I checked.

Rebuild stance vocabulary (as requested):

- **keep-and-ported-already** — the capability exists in `app-next` today (I checked
  `/Users/johansardar/ExcerLock/app-next/src`).
- **keep-not-yet-ported** — the rebuild plan says port it (Phase 2), and `app-next` has only
  a port interface or a fake for it.
- **cut** — the rebuild plan explicitly retires it.
- **undecided** — the plan does not name it either way.

Source of the stances: `/Users/johansardar/ExcerLock/plans/rebuild/00-decisions.md` sections B
(lines 18–41) and F (lines 78–85), and `/Users/johansardar/ExcerLock/plans/rebuild/04-architecture.md`
§3 (lines 58–76) and §5 (lines 117–144).

---

## 0. Map of the old app

`/Users/johansardar/ExcerLock/app/src` contains 29 module directories (`ls` output):
account, analysis, analytics, branding, debug, diagnostics, e2e, experiments, harness, home,
ledger, lock, manage, notifications, observability, onboarding, paywall, review, runtime,
schedule, screentime, settings, shareCards, shield, signals, subscription, support, ui, updates.

`/Users/johansardar/ExcerLock/app/modules` contains two local Swift Expo Modules:
`excerlock-motion` and `excerlock-gait-vision`.

`/Users/johansardar/ExcerLock/app/targets` contains four native Apple targets:
`app-intents`, `DeviceActivityMonitorExtension`, `ShieldAction`, `ShieldConfiguration`
(`app/targets/README.md:1-13`).

`/Users/johansardar/ExcerLock/app/plugins` contains three local config plugins plus a `healthkit`
patch dir (`app/plugins/README.md:1-31`).

Routes are thin re-exports (`app/app/`): `_layout.tsx`, `index.tsx`, `(onboarding)/`,
`(tabs)/{_layout,index,manage,analysis,settings}.tsx`, `locked-apps.tsx`, `treadmill-scan.tsx`,
`diagnostics.tsx`, `e2e/`. The old tab set was **Home · Manage · Analysis · Settings**, versus the
rebuild's Home · Conditions · Analytics · Settings (`plans/rebuild/00-decisions.md:48`).

---

## 1. Screen Time blocking (authorization, app picker, shields, schedules)

**What the user could do.** Grant Screen Time permission, open Apple's system app/category picker
and choose a set of apps/categories to lock, see "what is shielded right now", and set recurring
lock windows (weekly days + start/end wall-clock minutes) after which the apps shield.

**Where it lived.**
- Seam + mock: `app/src/screentime/README.md:1-114`, `app/src/screentime/index.ts`.
- Native adapter: `app/src/screentime/native/README.md:1-85`
  (`deviceActivityApi.ts`, `NativeScreenTimePickerHost.tsx`, `NativeScreenTimeModule.ts`,
  `NativeShieldScheduler.ts`, `deviceActivitySchedule.ts`, `nativeStore.ts`).
- In-app surface: `app/src/lock/screens/LockScreen.tsx`, cards in `app/src/lock/components/`
  (`PermissionPanel.tsx`, `LockedAppsCard.tsx`, `LockStatusCard.tsx`, `LockWindowsCard.tsx`,
  `LockWindowEditor.tsx`, `LockWindowRow.tsx`, `FullLockCard.tsx`,
  `FullLockConfirmationPrompt.tsx`).
- Controller: `app/src/lock/controller/lockController.ts` (384 lines).

**OS mechanism.** FamilyControls authorization; `FamilyActivityPicker` presented natively with the
opaque selection id `excerlock.selection.locked.v1`; ManagedSettings shield application;
DeviceActivity schedules and monitors; app group `group.com.johansardar.excerlock`; deployment target
iOS 17.4 (`app/src/screentime/native/README.md:11-14`, `:33-36`, `:60-62`).

**Edge cases its code/tests handled.**
- **Opaque-handle law** — a selection never yields bundle ids or app names; the only description is
  an adapter-composed count string ("4 apps · 2 categories"); a stale persisted handle
  degrades to "choose your apps" instead of crashing (`app/src/screentime/README.md:30-43`).
- **Runtime misidentification** — mock only for tests / Expo Go / non-iOS; every other iOS runtime
  fails *toward* native, and an iOS `Standalone` runtime carrying contradictory Expo Go metadata
  throws at startup rather than silently simulating a lock that never blocks anything
  (`app/src/screentime/README.md:45-61`).
- **Idempotent reconciliation** — repeating authorization/schedule registration with the same state
  is a no-op and emits no duplicate observable state, but the native adapter may still re-arm the OS
  usage ladder or renew the 15-minute lease (`app/src/screentime/README.md:100-105`).
- **Window boundary semantics** — active at the start boundary, inactive at the end boundary; with no
  windows the desired state applies all day; once windows exist shields are clear outside them
  (`app/src/screentime/README.md:97-100`).
- **Monitor registration failure** — if registering the renewal monitor fails, the adapter applies the
  shield before returning the error (fail closed) (`app/src/screentime/native/README.md:30-32`).
- **Never backdate a lease start** (`app/src/screentime/native/README.md:28-30`).
- **Force-quit survival** — the interval monitor survives host-app force-quit only once the
  `ActivityMonitorExtension` target exists (`app/src/screentime/native/README.md:41-43`).
- **Simulator truth** — measured 2026-08-04: real FamilyControls `.individual` authorization
  *completes silently* on a fresh iOS 26.4.1 simulator (no sheet, remembered across uninstall and
  `simctl privacy reset`), so the deny path and actual shield enforcement cannot be proven there
  (`app/src/screentime/README.md:85-94`, `app/src/screentime/native/README.md:66-75`).
- **`requestAuthorization()` resolves to the re-read OS status instead of rejecting**, because on a
  device FamilyControls records the refusal before it throws (`app/src/screentime/README.md:91-94`).
- **E2E capture hazard** — the shared lock controller captures its ScreenTime module at construction;
  a scenario that swaps the module must install a controller built *after* the swap, or the
  launch-time native adapter keeps applying **real shields** while every scenario surface reads the
  mock (observed 2026-08-04) (`app/src/lock/README.md:110-116`).

**Rebuild stance.** keep-not-yet-ported. `04-architecture.md:65` routes it behind `ScreenTimePort`
("delete drain-ladder scheduling; add window schedules + usage threshold monitor",
`04-architecture.md:125`). `app-next` has `src/ports/ScreenTimePort.ts` and
`src/demo/fakes/ScreenTimeFake.ts` only.

---

## 2. Lock precedence / "what is blocked and why"

**What the user could do.** See one honest status line: shields up or down, the cause, and when it
flips.

**Where it lived.** `app/src/lock/model/lockPrecedence.ts:39-80` (the one pure decision),
`app/src/lock/controller/lockPolicy.ts`, `app/src/lock/model/lockStatus.ts`,
`app/src/lock/README.md:56-75`.

**The old order** (`lockPrecedence.ts:47-79`): 1) verified walking opens the apps; 2) outside every
configured window apps are open and balance does not drain; 3) remaining balance opens the apps;
4) with no balance, Full Lock is the cause before an active window, otherwise the active window or
empty balance. Causes: `walking | outsideWindow | earnedBalance | fullLock | activeWindow |
emptyBalance`.

**Edge cases.** Walking during a *non-active* window opens apps but does not drain
(`lockPrecedence.ts:50`). Full Lock is not a mode, it is `baseAllowanceMinutes === 0`, and entering
remembers the allowance it replaced so exiting restores it (`app/src/lock/README.md:48-54`).
Precedence cannot vary with component/render order because one function settles it
(`app/src/lock/README.md:68-70`).

**Rebuild stance.** cut/replace — `04-architecture.md:128` says **replace** `lockPrecedence.ts` with
`domain/resolveLock` (B2, B6). `app-next/src/domain/resolveLock.ts` exists. The time-bank half of the
precedence (balance, drain, Full Lock) is cut by B1/F.

---

## 3. Shield extension content (what a blocked app shows)

**What the user could do.** Tapping a blocked app showed a native shield with a cause-specific title,
a subtitle that is the *cheapest actionable offer* from their own conditions, and one action button.

**Where it lived.** `app/src/shield/` — `ShieldCauseResolver.ts`, `ShieldContentCoordinator.ts`,
`ShieldContentPublisher.ts`, `shieldContentRuntime.ts`, `shieldCopySource.ts`, `unlockOffer.ts`,
`appShieldContent.ts`, plus `app/src/shield/native/`. Swift targets:
`app/targets/ShieldConfiguration`, `app/targets/ShieldAction`.

**OS mechanism.** ManagedSettings `ShieldConfiguration` and `ShieldAction` app extensions reading
three versioned keys from app-group `UserDefaults` via `react-native-device-activity`'s shared
UserDefaults API — no new native module (`app/src/shield/README.md:8-23`).

**Edge cases.**
- **JS suspended at lock-window start** — the native schedule writer stores each monitor's
  lock-window context in the app group, and the generated monitor calls an app-owned Swift helper
  before the shield reads it; the config plugin injects that call on every clean prebuild
  (`app/src/shield/README.md:25-28`).
- **Ordering** — the current cause is committed *after* its runtime context so the extension cannot
  select a variant with stale details (`app/src/shield/README.md:38-40`).
- **Transition vs state** — `walkAndScrollEnded` is latched, because "the walk just ended" is a
  transition, not a state (`app/src/shield/ShieldCauseResolver.ts:5-36`).
- **No route home** — a ShieldAction cannot open its host app. With notification permission approved,
  the action queues a silent local deep-link notification; **without permission the variants collapse
  to a single "Close" button** rather than presenting a dead route; lock-window always shows "OK" and
  never queues a notification (`app/src/shield/README.md:66-73`).
- **Remote copy** — one validated flag payload replaces bundled copy exactly; no client-side
  rotation; malformed payload falls back to the bundled four-copy set
  (`app/src/shield/README.md:58-64`).
- **Verification boundary** — shields cannot render on a simulator, so visual variants and tap-through
  remained device-unverified (`app/src/shield/README.md:77-81`).

**Rebuild stance.** keep-not-yet-ported, **reduced**: `04-architecture.md:127` — port, "wire causes
reduced to `locked`, `lockWindow`, `walkingEnded`". `app-next` has
`src/domain/shieldContent.ts` and `src/features/sessions/ShieldPreview.tsx` (a preview, not the
extension).

**Gap `app-next` has no equivalent for:** the app-group publication ordering, the JS-suspended
lock-window context write, and the notification-permission-dependent action collapse.

---

## 4. Walking verification ("unlocked only while walking" / Walk & Scroll)

**What the user could do.** Start an explicit walking session from a condition card; apps stayed open
while verified walking continued and re-locked when it lapsed.

**Where it lived.** `app/src/home/signals/walkingSessionController.ts` (625 lines),
`app/src/signals/motion/WalkVerifier.ts`, `app/src/signals/motion/constants.ts`,
`app/modules/excerlock-motion` (Swift).

**OS mechanism.** `CMMotionActivityManager` classification + `CMPedometer.currentCadence` streamed by
the local Expo Module; `expo-location` foreground high-accuracy "Fitness" updates as a background
keep-alive with the iOS location indicator visible; DeviceActivity 15-minute non-repeating monitor as
the OS-side fail-safe lease (`app/modules/excerlock-motion/README.md:1-15`,
`app/src/signals/location/README.md:46-49`, `app/src/screentime/native/README.md:25-32`).

**Verification rule.** Walking classification **and** fresh cadence ≥ 65 steps/min
(`app/src/signals/motion/constants.ts:5`), cadence expiring after 5 s
(`constants.ts:11`), and two consecutive qualifying cadence samples to establish sustained walking
(`constants.ts:17`, `WalkVerifier.ts:75-118`).

**Edge cases handled.**
- **Automotive disqualifies immediately** (`WalkVerifier.ts:55-57`).
- **Denied motion authorization disqualifies immediately** (`WalkVerifier.ts:67-69`).
- **Stale cadence cannot verify a resumed walk** — cadence must be no older than 5 s and must be at
  or after the activity sample's `startedAt` (`WalkVerifier.ts:111-113`).
- **Stop grace is anchored to the activity sample's `startedAt`**, not to "now"
  (`WalkVerifier.ts:120-140`); the user-chosen grace is 30 s–5 min and is *validated*, throwing
  outside that band (`WalkVerifier.ts:30-38`).
- **Watchdog** — grace expiry and cadence-freshness expiry publish on a timer without waiting for
  another sensor event (`walkingSessionController.ts:529-549`).
- **15-minute renewable lease** — every verified publication renews to exactly 15 minutes from now; a
  **lapsed window can never be extended** (force-quit caps the exploit at one increment)
  (`walkingSessionController.ts:442-500`, `packages/ledger/README.md` "Walk & Scroll session math").
- **Lease expiry evaluated lazily on read** — `getSnapshot()` calls `expireWalkLeaseIfNeeded()` so a
  suspended-timer app cannot report a stale "still walking" (`walkingSessionController.ts:108-116`).
- **Lease-expiry warning notification** 30 s before expiry, only when notification permission is
  already approved, never prompting, cancelled on renew or stop
  (`app/src/notifications/walkLeaseWarning.ts:3-41`, `app/src/notifications/README.md:22-29`).
- **Active-window end, including windows that cross midnight** — a timer stops the session at the
  condition's window end, with an explicit `+DAY_MS` when the window crosses midnight and the current
  minute is past the start (`walkingSessionController.ts:506-527`).
- **Sensor start failure rolls everything back** — unsubscribes, clears providers, publishes IDLE and
  stops motion/placement/keep-alive before rethrowing (`walkingSessionController.ts:247-265`).
- **Condition switched off / deleted / outside window mid-session** — `reconcileCondition()` stops the
  session and tears down both native providers (`walkingSessionController.ts:146-168`).
- **Double start** — starting the same condition twice returns true without a second session;
  starting a different condition while active returns false (`walkingSessionController.ts:195-197`).
- **Propped mode requires a placement provider or throws**
  (`walkingSessionController.ts:203-205`).
- **Silent dependency-set drift** — `createDefaultWalkingSessionDependencies` is exported precisely so
  instrumentation decorates rather than rebuilds; a hand-assembled copy once lost `createPlacement`
  and `leaseWarning`, disabling propped mode in the very build meant to test it, with nothing failing
  (`walkingSessionController.ts:570-575`, `app/src/diagnostics/README.md:31-36`).
- **E2E composition trap** — with `walking: null` and no `walkingState`, `activeSignals` can never
  report walking and the hold state is unreachable; this silently broke the E2E root once
  (`app/src/home/README.md:40`).
- **Simulator is a dead end for this whole path** — measured 2026-08-01:
  `CMMotionActivityManager.isActivityAvailable()`, `CMPedometer.isStepCountingAvailable()` and
  `isCadenceAvailable()` are all `false` and live calls fail with `CMErrorMotionActivityNotAvailable
  (104)` — sensor backend absent, not blocked, so no permission/entitlement route changes it
  (`app/modules/excerlock-motion/README.md:59-92`).

**Rebuild stance.** keep-not-yet-ported (B3 line 24, B12 line 33; `04-architecture.md:67`, `:127`).
`app-next` has `src/ports/WalkingPort.ts` (10 lines) and `src/demo/fakes/WalkingFake.ts`; the port
exposes `start/stop/completeProppedScan/observe/details/treadmillFraming` and a `graceUntil` string.

**Gaps `app-next` has no equivalent for:** the 65 steps/min + 5 s freshness + 2-sample rule, the
automotive/denied-auth disqualifiers, the activity-anchored grace, the watchdog, the 15-minute lease
and its non-extensible-after-lapse property, the lease-warning notification timing, and the
midnight-crossing active-window teardown.

---

## 5. Treadmill / propped-phone camera verification (gait vision)

**What the user could do.** Prop the phone on a treadmill console; the front camera confirmed they
were walking, which unlocked apps hands-free; picking the phone up handed off to ordinary motion
verification; setting it down returned to a shielded scan.

**Where it lived.** `app/src/home/treadmill/` (`TreadmillScanController.ts` 209 lines,
`TreadmillScanCoordinator.ts` 38 lines, `TreadmillScanScreen.tsx` 220 lines,
`treadmillScanRuntime.tsx`), `app/src/signals/gait/` (`GaitPeriodicityDetector.ts`,
`NativeGaitVisionProvider.ts`, `FixtureGaitVisionProvider.ts`),
`app/src/signals/placement/` (`PhonePlacementClassifier.ts`, `NativePhonePlacementProvider.ts`),
`app/modules/excerlock-gait-vision` (Swift), route `app/app/treadmill-scan.tsx`.

**OS mechanism.** One `AVCaptureSession` on the front camera at 640×480 / 15 fps;
`VNDetectHumanBodyPoseRequest` on every other frame; plus face detection because a console-propped
phone sees head and shoulders only — Vision's body-pose model finds a body in ~15 % of those frames
while face detection finds the head in ~99 %, so the detector reads walking from **head bob** when
the trunk is out of view (`app/src/signals/gait/README.md:1-11`,
`app/modules/excerlock-gait-vision/README.md:1-14`). Placement uses `CMDeviceMotion` gravity and
rotation-rate.

**Thresholds actually measured on a treadmill.** Placement: two features per 1-second window (largest
gravity deviation from the window mean; median rotation-rate magnitude), decided on their medians over
a 3-second horizon; a walking hand swings gravity ≥0.039 g in 95 % of windows and rotates ≥0.32 rad/s,
a propped phone stays within 0.015 g and 0.26 rad/s apart from sub-second jolts; thresholds sit
between at 0.03 g / 0.45 rad/s; leaving `propped` needs 3 s of continuous hand evidence, a set-down
needs 1.5 s; real device recordings pin the behaviour in
`app/src/signals/placement/__tests__/fixtures/treadmillRecordings.json`
(`app/src/signals/placement/README.md:7-19`).
Gait: `GAIT_SCAN_TIMEOUT_MS = 5_000`, `GAIT_MIN_FREQUENCY_HZ = 1.2`, `GAIT_MAX_FREQUENCY_HZ = 3`,
`GAIT_REQUIRED_QUALIFYING_STRIDES = 4` (`app/src/signals/gait/GaitPeriodicityDetector.ts:7-10`).

**Edge cases.**
- **Camera permission denied mid-flow** — the coordinator stops the propped session and starts the
  ordinary handheld verifier *before* the user dismisses the explanation
  (`app/src/home/treadmill/README.md:12-15`, `TreadmillScanCoordinator.ts:25-28`).
- **Bad framing** — a 5-second attempt with a 30-second recoverable framing grace
  (`TreadmillScanController.ts:8`, `:128-152`); a failed grace stops the unverified session
  (`TreadmillScanCoordinator.ts:34-37`).
- **Phase machine** — `scanning → propped → handheld → handoff` with a fixed 60-second set-down window
  before returning to a shielded scan (`walkingSessionController.ts:31`, `:376-426`).
- **Pickup allows 20 s for cadence before the configured exit grace begins**
  (`walkingSessionController.ts:30`, `:385-390`, `:428-440`).
- **Set-down pauses the exit path rather than racing it** — it clears the pickup timer, the exit
  timer and the watchdog (`walkingSessionController.ts:392-408`).
- **Lease expiry in propped mode returns to `scanning`** instead of ending the session
  (`walkingSessionController.ts:491-498`).
- **No frame retention** — frames are processed on-device and never recorded, retained or sent;
  camera permission is requested only when the route starts its first native scan
  (`app/src/home/treadmill/README.md:8-11`, `app/modules/excerlock-gait-vision/README.md:9-13`).
- **Harness-only capture override** — `beginHarnessCapture` writes the same stream to a sandboxed
  H.264 movie excluded from backups; normal product `start` never enables the writer
  (`app/modules/excerlock-gait-vision/README.md:24-29`).
- Native preview framing, Vision throughput and front-camera orientation stayed **device-unverified**
  (ticket #113) (`app/src/home/treadmill/README.md:17-18`).

**Rebuild stance.** keep-not-yet-ported, explicitly **ported not rewritten** (B12, line 33). `app-next`
already has UI for it — `src/features/unlock/TreadmillUnlockScreen.tsx`,
`src/features/unlock/gait/TreadmillScanController.ts`, `src/ports/GaitPort.ts`,
`src/demo/fakes/GaitFake.tsx` — so the *screen* is keep-and-ported-already while the *sensing* is
keep-not-yet-ported. B20 (line 41) adds a confetti/aha ceremony this screen did not have.

---

## 6. Gym presence: manual check-in, geofence auto-detect, saving a gym

**What the user could do.** Stand in their gym and save it as a named 100 m circle; later press
**Check in** to claim an arrival on demand; or opt in from Settings to hands-free auto-detect.

**Where it lived.** `app/src/home/signals/gymPresenceController.ts` (248 lines),
`app/src/signals/location/` (`NativeLocationProvider.ts`, `ExpoLocationClient.ts`,
`GeofenceEventProcessor.ts`, `AsyncStorageGymVisitLog.ts`, `registerLocationTasks.ts`,
`LocationTaskRuntime.ts`, `ManualGymCheckIn.ts`, `gymRegions.ts`, `regionPresence.ts`),
`app/src/home/builder/components/SaveGymCard.tsx`.

**OS mechanism.** `expo-location` geofencing regions + `expo-task-manager` headless tasks; foreground
`When In Use` for saving/manual check-in; background `Always` only for auto-detect; a second
continuous-background-location task for the walk keep-alive
(`app/src/signals/location/README.md:17-30`, `:44-49`).

**Limits.** At most 5 saved gyms; radius default 100 m, min 50 m, max 200 m, asserted in code
(`app/src/signals/location/gymRegions.ts:3-27`).

**Edge cases.**
- **Dwell/blip debounce** — raw presence changes immediately on a region event (no dwell state), but
  a separate invisible **30-second confirmation** delays when the arrival *counts*; an exit inside
  that window cancels the arrival; manual and automatic arrivals share the processor
  (`app/src/signals/location/README.md:32-37`,
  `app/src/signals/location/GeofenceEventProcessor.ts:4`, `:28-56`).
- **Idempotent replay** — confirmed arrivals persist only `{regionId, atMs}`; ledger event ids make
  replay idempotent so re-reading the on-device visit log cannot double-pay
  (`app/src/signals/location/README.md:36-40`, `gymPresenceController.ts:175-210`).
- **Coordinate privacy** — coordinates exist only in memory for the OS boundary and the distance
  check; never logged, never sent to analytics (`app/src/signals/location/README.md:35-37`).
- **App killed / headless relaunch** — `registerLocationTasks` is imported at the Expo Router entry
  module so Task Manager can find both task definitions during a headless launch; the geofence task
  owns the confirmation processor and the visit log; app-open reconciliation claims visits persisted
  by the background task (`app/src/signals/location/README.md:38-49`).
- **Permission promotion is never implicit** — only `enableAutoDetect()` may request `Always`; the
  app-lifetime host merely restores a persisted opt-in when `Always` is *already* granted and quietly
  does nothing otherwise; turning auto-detect off stops monitoring but leaves manual check-in intact
  (`app/src/signals/location/README.md:24-30`,
  `gymPresenceController.ts:82-139` — note the explicit
  `if (location.getAuthorizationStatus() !== "authorizedAlways") return;` at `:133`).
- **JS reload** — Expo permission and registered-task state are rehydrated after a JS reload
  (`app/src/signals/location/README.md:48-49`).
- **Known unproven risk** — this lane had **no physical iPhone**. A simulator cannot establish that
  iOS relaunches the app for a real region event, or that the headless task gets enough execution time
  to finish the 30-second debounce and persist the visit. If the Task Manager window is too short, the
  debounce must move into a small native Swift module without widening `LocationProvider`
  (`app/src/signals/location/README.md:52-58`). **This is the single largest carried-forward risk in
  the location stack.**

**Rebuild stance.** keep-not-yet-ported for sensing (B11 line 32: "geofence auto-detect promoted,
manual check-in kept as built"; `04-architecture.md:68`, `:127`). Map search and pin is **new** work
(`04-architecture.md:68`). `app-next` already has the picker UI —
`src/features/gym-picker/{GymPickerScreen,FindStep,PlaceStep,PickerMap,usePicker,geometry}.tsx`,
`src/ports/GymPort.ts`, `src/ports/PlaceSearch.ts`, `src/demo/fakes/GymFake.ts` — and a gym unlock
screen `src/features/unlock/GymUnlockScreen.tsx` / `useGymUnlock.ts`.

**Gap:** `app-next`'s `GymPort.checkIn` takes an optional `{milliseconds, signal}` confirmation
(`app-next/src/ports/GymPort.ts:9`) but nothing carries the 5-gym cap, the 50–200 m radius band, the
visit-log idempotency, or the headless-relaunch claim.

---

## 7. Steps / pedometer

**What the user could do.** Have step-goal conditions read the phone pedometer.

**Where it lived.** `app/modules/excerlock-motion` (`CoreMotionService.swift`,
`ExcerlockMotionModule.swift`), `app/src/signals/motion/NativeMotionProvider.ts`,
`MotionModuleClient.ts`, historical `queryActivity`/`querySteps`
(`app/modules/excerlock-motion/README.md:9-15`).

**OS mechanism.** `CMPedometer` step and cadence queries + `CMMotionActivityManager`;
`NSMotionUsageDescription` added by the module's config plugin.

**Edge cases.** Availability gate returns a hard unavailability error on a simulator, so no path past
it can execute there (`app/modules/excerlock-motion/README.md:89-92`). Motion observations never
logged, never attached to analytics (`:36-37`). Idempotent `start`/`stop` (`:11-13`).

**Rebuild stance.** keep-not-yet-ported; B11 (line 32) makes the phone pedometer the **only** source
for walking step goals (HealthKit steps are out). `app-next` has `src/ports/StepsPort.ts` +
`src/demo/fakes/StepsFake.ts`.

---

## 8. HealthKit (workouts, active energy, distances, active minutes)

**What the user could do.** Have conditions read Apple Health totals for the day.

**Where it lived.** `app/src/signals/health/` (`NativeHealthProvider.ts`,
`KingstinctHealthKitClient.ts`, `HealthKitClient.ts`, `healthKitTotals.ts`,
`healthKitSignalMapping.ts`, `FixtureHealthProvider.ts`), plugin
`app/plugins/withHealthKitBackgroundBootstrap.js` (+ `.mm`), `app/plugins/healthkit/`.

**OS mechanism.** `@kingstinct/react-native-healthkit` pinned at exactly 14.0.2, patched so
background AppDelegate injection is disabled — importing the Nitro-backed Swift module directly from
Expo's Swift app target does not compile for iPhoneOS; the local plugin generates a small
Objective-C++ bridge, preserves the background-delivery entitlement and calls the bridge from
AppDelegate (`app/src/signals/health/README.md:15-21`).

**Edge cases.**
- **Manual entries excluded** — `getTodayTotal` drops `wasUserEntered` samples (device-recorded-only
  rule) (`app/src/signals/health/README.md:6-8`).
- **Active minutes never double-counted** — recorded `appleExerciseTime` wins when present, otherwise
  recorded workout durations; the two are never added (`:22-24`).
- **Apple never says whether a *read* was granted** — `authorized` means the request completed and
  queries are safe to attempt, not that the user granted every type; empty results stay ambiguous by
  platform design, and the seam deliberately was not widened to fake a status HealthKit cannot supply
  (`:32-36`).
- **Background delivery is best effort** — configured at immediate frequency, but iOS may delay it and
  force-quit stops JS delivery, "so callers must not promise instant unlocks"; foreground anchored
  reads are the reliable path and an already-mounted Home re-claims on every foreground
  (`:26-30`).
- **Never logged or sent to analytics** (`:29-30`).
- **Unverified** — no real simulator HealthKit seeding, no physical device; Apple Health reads,
  cold-launch delivery and the resulting payout remained unverified (`:41-44`).

**Rebuild stance.** keep-not-yet-ported, **narrowed**: B11 (line 32) limits HealthKit to running and
biking workouts only. `04-architecture.md:69` names the pinned version, patch and bootstrap plugin as
the port target. `app-next` has `src/ports/HealthPort.ts` + `src/demo/fakes/HealthFake.ts`.

---

## 9. SignalKit: the provider seam, fixtures and the timeline player

**What it was.** One interface per signal domain (gait, health, motion, placement, location, screen
time, vendor), each with a native and a fixture implementation, selected once at the composition root
so screens never branch on provider availability (`app/src/signals/README.md:1-13`).

**Fixtures.** Every fixture is a named, versioned manifest of sorted `{atMs, event, payload}` rows.
History at or before zero applies synchronously; future rows use manual clock advancement or
accelerated auto playback. Unknown event names, invalid timelines, non-JSON payloads and unknown
catalog names **fail at load** (`app/src/signals/README.md:14-18`,
`app/src/signals/timeline/README.md:1-11`). `SIGNAL_FIXTURE_CATALOG` is the composition-root resolver
(`app/src/signals/README.md:19-20`).

**Named canonical fixtures** (these encode the edge cases someone thought through):
- motion: `steady-walk`, `red-light`, `stop-for-good`, `drive-off`, `shaky-cheat`,
  `late-classification`, `denied-permission` (`app/src/signals/motion/README.md:34-36`).
- location: `gym-enter-exit`, `region-blip`, `quiet` (`app/src/signals/location/README.md:60-61`).
- health: `day-mixed-sources`, `manual-entry-day`, `background-wake-replay`,
  `day-steps-approaching-5k` (`app/src/signals/health/README.md:46-47`).
- screentime: `tick-ladder-basic`, `tick-ladder-jitter`, `re-arm-race`
  (`app/src/signals/screentime/README.md:10-11`).
- vendor: Strava recorded/manual/trainer, Whoop `PENDING_SCORE`, Polar's missing manual flag, Oura
  daily activity, all-disconnected (`app/src/signals/vendor/README.md:9-12`).

`shaky-cheat` and `region-blip` are the two named anti-cheat / phantom-signal fixtures.

**Rebuild stance.** keep-not-yet-ported as a whole (`04-architecture.md:126` — port `signals/**`
behind the new ports; delete `signals/vendor` and `signals/screentime` if unused).
`app-next/src/demo/scenarios/` is the replacement idea (`04-architecture.md:103-108`), but it is a
scenario object, not a timestamped timeline player with load-time validation.

**Gap:** `app-next` has no `TimelinePlayer` equivalent and no `shaky-cheat` / `red-light` /
`region-blip` / `late-classification` analogue (checked `app-next/src/demo/scenarios/`).

---

## 10. Conditions: catalog, builder, edit, on/off

**What the user could do.** Build a condition through **catalog → source → configure → banner →
preview → save**; edit a saved one from Manage through the same sheet; switch one off without
deleting it; delete with an inline confirmation.

**Where it lived.** `app/src/home/builder/` (`ConditionBuilderSheet.tsx`, `builderDraft.ts`,
`builderCatalog.ts`, `steps/{CatalogStep,SourceStep,ConfigureStep,BannerStep,PreviewStep}.tsx`,
`components/{OptionPills,ValueStepper,SaveGymCard}.tsx`), `app/src/manage/`
(`ManageScreen.tsx`, `ConditionRow.tsx`, `conditionRows.ts`, `AllowanceCard.tsx`),
`packages/condition-model`.

**Rules the model enforced** (`packages/condition-model/README.md:20-33`):
- Kinds are `state`, `event`, `rate`, with a strict kind→reward mapping that cannot be mixed.
- Uniqueness key is `(kind + signal + source + place)`; threshold is never part of the key.
- Event and rate conditions on the same signal+source block one another; state conditions conflict
  only with exact duplicates.
- Vendor coverage cells are `promoted | weak | impossible`; impossible stays hidden, weak is
  selectable but never promoted, a direct source is hidden until connected.
- Evaluation reads only rows inside the supplied day and through `nowMs`; **cumulative snapshots
  outside an active window establish a baseline but cannot earn** — only movement inside the window
  is evaluated.
- Meaningful streak activity floor: 15 credited rate minutes or 10 sustained state minutes.

**Builder edge cases.** No picker is ever pre-filled — a draft carries `undefined` until the user
chooses, and `canAdvance` will not leave the configure step until a complete condition can be produced;
the preview renders that exact condition (`app/src/home/README.md:66-70`). The source step only appears
when more than one source can supply the signal (`:53-55`). Editing reuses the same sheet via
`draftFromCondition`, opening on **configure** because catalog+source are what a condition *is*, and
`Back` never goes behind the opening step (`app/src/manage/README.md:36-44`). The sheet reads
`initialDraft` once on mount, so Manage mounts it under `key={condition.id}` (`:43-44`).
Off ≠ deleted: a switched-off condition keeps its uniqueness key so its catalog slot stays taken, but
it leaves the dashboard and the store refuses its payouts (`app/src/manage/README.md:46-50`).
Deletion confirms inline, never through a native `Alert`, because a native dialog cannot be driven by a
test (`:51-53`).

**Rebuild stance.** Mixed.
- The *builder flow* is keep-and-ported-already in spirit: `app-next/src/features/conditions/`
  (`ConditionBuilder.tsx`, `builderFlow.ts`, `useBuilder.ts`, `ConditionsScreen.tsx`).
- The **rate kind is cut** (B4, line 25). Vendor sources are cut (B10, line 31; D6 line 65).
- **Per-condition banners are cut** by omission — `app/src/home/banners/README.md:1-14` describes a
  21-banner painted-family manifest plus own-photo picking; `plans/rebuild` never mentions banners.
  Status: **undecided/likely cut** (the 21-banner library never existed anyway,
  `app/src/home/README.md:96-98`).
- `packages/condition-model` is **not used** by the new app (`04-architecture.md:11`).

---

## 11. Time bank / ledger economy (allowance, drain, earn, rollover, Full Lock)

**What the user could do.** Set a daily base allowance (0–4 h grid plus Unlimited), earn minutes from
conditions, watch the balance drain as they used the locked apps, roll unused minutes over up to a cap,
and set Full Lock (allowance = 0).

**Where it lived.** `packages/ledger` (pure math), `app/src/ledger/` (persistence + app-group balance
mirror, `app/src/ledger/README.md:1-10`), `app/src/manage/components/AllowanceCard.tsx`,
`app/src/home/model/allowance.ts`, `app/src/lock/components/FullLockCard.tsx`,
`app/src/screentime/native/NativeShieldScheduler.ts` (the drain ladder).

**Mechanism.** A DeviceActivity **usage ladder** re-armed per local day with
`includesPastActivity: true`, whose final rung applies the shield OS-side — the reason the deployment
target is iOS 17.4 (`app/src/screentime/native/README.md:33-36`). `planDrainLadder` computed 1-minute
absolute cumulative-usage thresholds and re-arming after any balance change or force-quit is simply
calling it again with the current usage count (`packages/ledger/README.md`).

**Edge cases.** Idempotent journal keyed `(source, id)` — HealthKit anchors, workout UUIDs and tick
event names map straight in; replaying any batch is a no-op; reduced state is order-independent;
first write wins. Drain ticks clamp at zero, never negative. Rest-of-day payouts are "shield
holidays" (shields down, balance not draining). Unset allowance is `UNLIMITED`, so the app never
invents a budget (`packages/ledger/README.md`, `app/src/home/README.md:87-91`).

**Rebuild stance.** **cut.** B1 (line 22) removes the time bank entirely — no allowance, earned
minutes, drain ladder, rollover, reward amount or per-step rate; `packages/ledger` is not used.
`04-architecture.md:139` retires `app/src/ledger/**` and `packages/ledger`.

**Note for the rebuild:** the drain-ladder machinery is the *only* thing in the old app that made
shields respond to usage OS-side while JS was dead. B15 (line 36) keeps a **usage monitor** for the
Analytics tab; that is the same DeviceActivity threshold mechanism, minus the ladder. Whoever ports
B15 should read `NativeShieldScheduler.ts` and `deviceActivitySchedule.ts` rather than starting cold.

---

## 12. Global schedule layer (rest days, holidays, one-day overrides)

**What the user could do.** Mark weekdays as recurring rest, add inclusive holiday ranges, and force a
single date active or rest, from **Your rules** on Manage.

**Where it lived.** `app/src/schedule/` — `classifyScheduleDay`, `scheduleStore.ts`,
`scheduleStorePersistence.ts`, `ScheduleRulesCard`
(`app/src/schedule/README.md:1-87`).

**Precedence law.** override → holiday → recurring rest → scheduledActive
(`app/src/schedule/README.md:11-19`). **Missing schedule data is deliberately "every day is active"**
— a missing, invalid or not-yet-hydrated schedule can never withhold the economy
(`:24-26`). Rules are stored against the ledger's integer `dayIndex`; conversions use UTC getters
because ledger timestamps are already local wall-clock ms, avoiding a second timezone interpretation;
tests cover midnight, a 04:00 boundary across the New York spring DST jump, and both inclusive edges
of a multi-day holiday (`:28-40`). Persistence treats storage as untrusted: filters weekdays, rejects
reversed/fractional ranges, rejects unknown override directions, dedupes, returns canonical sorted
arrays (`:42-54`).

**Rebuild stance.** **cut.** B9 (line 30): "The global schedule layer (rest days, holidays, one-day
overrides, global lock windows) is cut. A rule can be paused with a toggle."
`04-architecture.md:139` retires `app/src/schedule/**`.

**Worth carrying anyway:** the DST/midnight/local-wall-clock discipline. `app-next` has
`src/domain/schedule.ts` and `src/domain/calendar.ts` plus a `window-crosses-midnight` scenario
(`app-next/src/demo/scenarios/window-crosses-midnight.ts`), so the shape survives; the DST test corpus
does not obviously.

---

## 13. Recurring lock windows

**What the user could do.** Define weekly lock windows `{days, startMinute, endMinute}`; `days` are
the weekdays on which the interval **starts**, and an end earlier than a start crosses midnight
(`app/src/lock/README.md:77-93`).

**Edge cases.** Overlap is **rejected with an inline error**, across midnight and the weekly
Sunday/Monday seam; half-open adjacency (09:00–10:00 next to 10:00–11:00) is allowed; rejecting rather
than merging preserves each row's chosen days and stops an edit silently rewriting another row. A
one-minute window is valid; equal start and end is rejected as ambiguous (the UI refuses to guess
between zero-time and all-day). Times live in a local-wall-clock ms domain with uniform 24-hour days;
the device offset is folded in once at the edge so spring-forward and fall-back keep the user's chosen
wall times (`app/src/lock/README.md:83-93`, `app/src/lock/model/recurringLockWindow.ts`,
`windowOccurrences.ts`, `wallClock.ts`).

**Rebuild stance.** **cut as a global layer** (B9, line 30), but the *per-rule* time window survives —
each rule carries its own days and window. So the overlap-rejection law is cut (B5, line 26: "No
conflict validation beyond completeness") while the midnight-crossing math is
keep-not-yet-ported-in-spirit (`app-next/src/domain/schedule.ts`).

---

## 14. Analysis tab (Time Reclaimed, recap, heat map, streaks, day ledger, badges)

**What the user could do.** See a weekly recap, a "Time Reclaimed" hero, Week/Month/Year trends, a
streak card, a requirement heat map, per-condition earnings, a milestone badge shelf and a
day-by-day ledger (`app/src/analysis/README.md:1-10`, `:53-81`).

**Notable mechanics and edge cases.**
- **Time Reclaimed formula**: per-day saved = `max(0, confessed_daily_minutes − that day's
  locked-group usage)`, summed over the window. The clamp is deliberate so one blowout day never
  subtracts — but because a clamp hides something, `selectTimeReclaimed` keeps `overMinutes`,
  `netMinutes` and `overDays` and the hero prints one line of plain arithmetic when a day ran over
  (`app/src/analysis/README.md:106-117`).
- **Three non-numeric input states**: `unconfessed` (onboarding skipped — no numeral at all),
  `noBaseline` (a confession of zero — "nothing to reclaim against", never `−usage`, which would be
  scolding dressed as arithmetic), `measured` (`:119-125`).
- **The confession is read, never written** — PRD forbids editing it because a tunable baseline turns
  the hero into a vanity dial (`:41-44`).
- **Missing attribution is not zero** — `earnedMinutes` is optional; a condition whose records lack it
  reads `not recorded`, an explicit `0` stays `0m` (`:24-26`).
- **Every selector is total** — an empty ledger is a first-class input; nothing throws on day zero
  (`:21-23`).
- **Heat-map chronology is data, not object order** — cells compare `firstQualifiedAtMs`; `0` is a
  real instant, `undefined` means never qualified; ties break on condition id, never insertion order
  (`:33-36`).
- **Schedule-aware streaks** — rest/holiday/inactive-override days are transparent (neither increment
  nor break); a missed scheduled-active day breaks the run; a whole restful recorded week reads
  "Rest week" rather than dividing by zero (`:127-137`).
- **Sells, never scolds** — a day with no activity reads "No activity", no red, no ✗ (`:48-51`).
- **No chart library** — the week chart is two flex-height `View`s per day (`:20-22`).
- **Clock stops at the screen boundary** — selectors never call `Date.now()` (`:27-32`).
- **Milestones**: fixed 22-badge catalog in three ladders (Streaks 8, Activities 8, Time Reclaimed 6);
  `pending` consumed once by the next Analysis visit, `isNew` cleared only on tap; a shared
  AsyncStorage hydration gate stops both live discovery and a visit claim acting on an incomplete
  snapshot (`app/src/analysis/milestones/README.md:6-30`).
- **A measured animation failure worth remembering**: the unlock scale-in ran while the shelf was
  offscreen or the tab was compositing and finished before a badge could be seen — a timing/visibility
  failure, not a physics-tuning failure; the fix was a viewport hold plus a glint sweep
  (`app/src/analysis/milestones/README.md:73-114`).

**Rebuild stance.** Split:
- Analytics tab, streaks, weekly recap, Time Reclaimed: **keep** (B15 line 36, B16 line 37).
  `app-next/src/features/analytics/` and `src/domain/{reclaimed,streak}.ts` exist →
  keep-and-ported-already at the UI level.
- **Badges and share cards: cut** (B16, line 37; F line 82). `04-architecture.md:139` retires
  `app/src/analysis/**` badges/share/heat map and `app/src/shareCards/**`.
- The **heat map** is listed among the retired items in `04-architecture.md:139` — treat as **cut**.
- The **locked-app usage monitor** the Time Reclaimed number depends on is B15's one native risk and is
  keep-not-yet-ported.

---

## 15. Share cards

**What the user could do.** Project a weekly recap or an unlocked milestone into a 9:16 Story or 1:1
Feed card and hand it to the iOS share sheet.

**Where it lived.** `app/src/shareCards/` (`ShareCardInput.ts`, `ShareCardFormat.ts`,
`NativeShareCardModule.ts`, `MockShareCardModule.ts`, templates and preview sheets).

**Edge cases.** A hard privacy floor enforced at the *type* level: inputs contain only aggregate/date
facts, and constructors throw if a source, location or identity is appended; a compile-time typecheck
file gives each forbidden category its own control; a render-level negative control once observed the
exact `"20–26 Jul · Gym visit"` leak (`app/src/shareCards/README.md:9-37`). Capture and native share
are separated into two operations, and outbound sharing is gated on `Sharing.isAvailableAsync()`
(`:62-77`). Never run on a device or simulator (`:87-89`).

**Rebuild stance.** **cut** (B16 line 37, F line 82, `04-architecture.md:139`).

---

## 16. Onboarding

**What the user could do.** Walk a resumable 7-step rail:
`value-prop → confession → mirror → permissions-primer → pick-apps → paywall → sign-up`
(`packages/analytics-events/src/flow.ts:9-17`, screens in `app/src/onboarding/screens/`).

**Mechanics.** `flow.ts` derives the order from the locked `FLOW_SCREENS` analytics contract — the app
never redeclares the union or the order (`app/src/onboarding/README.md:4-6`, `:24-29`,
`app/src/onboarding/flow.ts:1-12`). Screens render one question and **never** navigate, request a
permission, open a purchase, create an account or emit analytics; only the central renderer chooses a
screen and emits `$screen` + `onboarding_screen_viewed` once per step per mounted session
(`README.md:5-7`, `:12-18`). Incomplete progress resumes; completed users go straight to the tab shell
on cold start; back never leaves the first step (`:26-29`).
`confessionStore` separately persists the self-reported daily phone minutes for Time Reclaimed
(`:8-10`); the answer value is never placed in the analytics payload (`:15-18`).

**Rebuild stance.** keep-and-ported-already in structure, **restructured in content**: C7 (line 53)
removes the time-bank screens ("How much screen time?" reward minutes, walking "earn time per step");
C8 (line 54) moves app picking and permissions to **after** the paywall as a setup sequence.
`app-next` has `src/onboarding/` plus `src/features/onboarding/` and `src/features/setup/`.
`04-architecture.md:133` requires `FLOW_SCREENS` to be updated to the new onboarding ids.

---

## 17. Paywall and subscriptions

**What the user could do.** Hit a hard paywall in onboarding, choose a plan, purchase or restore.

**Where it lived.** `app/src/subscription/` (`AdaptySubscriptionModule.ts`, `adaptyPaywall.ts`,
`adaptyEntitlement.ts`, `SubscriptionPaywall.tsx`, `PaywallProductOption.tsx`, `PaywallLoadError.tsx`,
`fallbackPaywall.ts`, `MockSubscriptionModule.ts`, `NoopSubscriptionModule.ts`),
plus the thin `app/src/paywall/` gate (`app/src/paywall/README.md:1-7`).

**Mechanics and edge cases.**
- One access level, `premium`; callers decide access only through `isPremiumEntitled(snapshot)` and
  must not inspect product ids, dates or vendor fields (`app/src/subscription/README.md:35-44`).
- **Hard gate stays closed on failure** — if a placement cannot load, the paywall presents a retry
  surface rather than letting the user through (`:93-95`, `:117-121`).
- **Keyless build** selects `NoopSubscriptionModule`, which stays locked and returns recoverable
  unavailable states instead of throwing (`:70-73`).
- **Product count/order/prices/trials come from Adapty**, never from the app; missing remote badges
  stay absent — "the app never synthesizes scarcity copy" (`:86-91`).
- **Identity handoff** — Adapty activates anonymously at bootstrap, purchase completes without an
  account, and only then is the user id attached (`:19-23`).
- **No purchase analytics from the client** — the ten `adapty`-owned events come only from Adapty's
  native PostHog integration; purchase success is app logic only because it changes the entitlement
  snapshot (`:123-130`).
- **Entitlement expiry is exact** — the mock expires at `renewsAtMs` from an injected clock (`:52-57`).
- The full ASC product catalog (two variants × annual/monthly/win-back) is documented at
  `app/src/subscription/README.md:97-115`; there is no weekly or lifetime product, and the decline
  placement must use the real win-back product — "the app generates neither a fake discount nor a
  countdown" (`:113-115`).
- **Never sandbox-verified**: no real StoreKit purchase, no entitlement observed round-tripping
  (`:117-121`).

**Rebuild stance.** keep-not-yet-ported for logic; the custom paywall UI is **replaced** by Adapty's
remote Paywall Builder (C6 line 52, `04-architecture.md:132`). B13 (line 34) keeps the hard paywall
with restore. `app-next` has `src/ports/SubscriptionPort.ts`, `src/demo/fakes/SubscriptionFake.ts`,
`src/features/subscription/`.

---

## 18. Account / auth

**What the user could do.** Sign in / sign up (Clerk, incl. Google OAuth via SSO), sign out, delete
the account.

**Where it lived.** `app/src/account/` (`AccountModule.ts`, `ClerkAccountModule.ts`,
`ClerkAccountBridge.tsx`, `AccountRuntimeRoot.tsx`, `AccountSettingsCard.tsx`,
`AccountOnboarding.tsx`, `MockAccountModule.ts`, `NoopAccountModule.ts`).

**Edge cases.**
- **Local-first law** — an account never gates earning or locking; signing out and deletion clear only
  the session, never Home/Lock/Settings/onboarding/ScreenTime storage; a signed-out integration test
  records a real payout and verifies shields still lift (`app/src/account/README.md:29-43`).
- **Deletion ordering law** — flush PostHog *before* the server request; after success discard anything
  queued during the request, reset the PostHog identity, log the Adapty customer out, and sign out of
  the auth provider **last**; the local session is cleared only after the authoritative
  `DELETE /v1/user` succeeds (`:57-66`).
- **`410 ACCOUNT_DELETED` is terminal recovery** — durably discard PostHog's queued identified events
  before reset, log Adapty out, clear the stale session, do not retry and do not emit a post-deletion
  event (`:102-105`).
- **Partial identity spine prevented** — a restored session stays signed out at the app boundary while
  the idempotent `PUT /v1/user` provisioning call retries (`:100-102`).
- **Keyless builds** select a signed-out no-op adapter so missing configuration cannot crash or
  fabricate a session (`:4-7`, `:114-117`).
- Deletion does **not** cancel the App Store subscription, and the user is told so (`:50-54`).
- The app deliberately emits no `account_deleted` event (single-emitter law) (`:58-60`).

**Rebuild stance.** **Replace the vendor, keep the shape.** D1 (line 60) removes Clerk entirely;
`04-architecture.md:135` says replace with a Supabase adapter behind `AuthPort` while keeping the
vendor-free `AccountModule` shape **and the deletion ordering law**. B18 (line 39): Apple, Google,
email; anonymous session from the first onboarding screen; sign-in never required. `app-next` has
`src/ports/AuthPort.ts` + `src/demo/fakes/AuthFake.ts`.

---

## 19. Notifications

**What the user could do.** Independently switch on three local notification types (afternoon nudge
with a 13:00–18:00 hourly time picker defaulting to 15:00; weekly recap at 18:00; streak last call at
21:00), all defaulting OFF (`app/src/notifications/README.md:8-19`, `:30-50`).

**Mechanism.** `expo-notifications` local one-off date triggers with deterministic ids
`typeId:dayIndex`; **no push token API, no remote payload, no server call** exists in the adapter;
`app/plugins/withNoPush.js` deletes `aps-environment` after `expo-notifications` adds it, and a
clean-prebuild guardrail fails if it reappears (`:92-108`).

**Edge cases.**
- **Permission is never requested during onboarding**; the first OFF→ON gesture while
  `notDetermined` opens a one-line primer, and only its "Allow notifications" action calls the
  boundary; denial keeps the type OFF and offers "Open Settings"; a preference is never enabled
  speculatively while the OS decision is pending (`:52-62`).
- **No master switch**; changing one key never reads or changes another; the map is rebuilt from the
  current catalog on hydration so removed types disappear and anything not literally `true` falls back
  to OFF (`:36-45`).
- **Delivery rules**: quiet hours 22:00 inclusive → 07:00 exclusive; one daily capped notification
  with recap ranked above nudge; streak last call has an explicit daily-cap exception; **no exception**
  to a maximum of five deliveries in a rolling seven days; go-quiet-on-openers for the two engagement
  pushes (`:76-83`).
- **Re-planning the same day updates rather than duplicates**; a silenced or ineligible type is
  cancelled without touching the others (`:74-76`).
- **Survives restart** — pending plan intent and settled delivery evidence persist locally so the
  rolling seven-day ceiling holds across app restarts (`:99-102`).
- **Taps are accepted only when a deterministic id and catalog route agree** (`:102-104`).
- **Walk-lease warning is an explicit exception** to the catalog — session infrastructure, no Settings
  toggle, does not count toward caps, cancelled when the lease renews or the session stops, schedules
  only when permission is already approved and never prompts from a walking session
  (`:22-29`, `app/src/notifications/walkLeaseWarning.ts:12-41`).
- **ShieldAction fallback host** accepts only extension request identifiers and the two ticket-owned
  URLs (`excerlock://`, `excerlock://locked-apps`), so unrelated notification data cannot become a
  route (`:110-115`).

**Rebuild stance.** **Reduce.** B14 (line 35): only two local notifications — the trial-ending reminder
and the walk-lease warning; no engagement notifications, no push infrastructure.
`04-architecture.md:136` — reduce. `app-next` has `src/ports/NotificationsPort.ts` +
`src/demo/fakes/NotificationsFake.ts`.

**Gap:** the walk-lease-warning survives by name in the port, but the "only when already approved,
never prompt, cancel on renew" discipline and the ShieldAction URL allowlist have no `app-next`
equivalent yet.

---

## 20. Support and feature requests

**What the user could do.** Send a support message, submit a feature request, and vote once per
feature request; see truthful `Sending… / Sent / Not sent` state and retry manually.

**Where it lived.** `app/src/support/` (`HttpSupportModule.ts`, `SupportHttpClient.ts`,
`supportServerContract.ts`, `MockSupportModule.ts`, `components/`).

**Edge cases.** Offline/failed sends are **not** auto-queued — saved, reported as not sent, retried
only on tap, because no background worker exists and implying one would be a lie
(`app/src/support/README.md:24-32`). A submission persisted as `submitting` before an interruption is
restored as **failed with an interruption explanation**, never as forever-sending (`:32-35`). Failure
taxonomy: offline/timeout retryable, `5xx` retryable, `4xx` visible but not retryable as the same
request, invalid success receipt fails closed instead of leaving `Sending…` (`:37-42`). An unsent
feature stays in history but is not presented as votable; vote failures never change the visible count
without a valid receipt (`:44-46`). A missing `EXPO_PUBLIC_API_URL` degrades to the offline behavior
rather than crashing (`:63-65`). The legacy storage key is deliberately unchanged so mock-era requests
survive the HTTP swap (`:26-29`).

**Rebuild stance.** keep-not-yet-ported, **reduced**: B17 (line 38) keeps the support form and cuts
feature-request voting; `04-architecture.md:137` — port composer + HTTP client, drop feature requests.
`app-next` has `src/ports/SupportPort.ts` + `src/demo/fakes/SupportFake.ts`.

---

## 21. Review / rating prompts

**What the user could do.** Be asked to rate the app at three earned moments, or tap a manual Rate row.

**Where it lived.** `app/src/review/` (`policy.ts`, `reviewStore.ts`, `ReviewCoordinator.ts`,
`nativeReview.ts`).

**Mechanism/edge cases.** Three-stage policy: fifth unlock after install day three, first 7-day streak,
then 30-day streak; a 30-minute post-shield cooldown; permanent stop conditions. The store persists
install age, unlock count, prompt count, last effective-shield activation and a manual-Rate stop flag.
The manual Settings row opens the store URL with the write-review query (never a button-triggered
in-app prompt, per Expo/store guidelines), and safely returns `false` until the store URL exists
(`app/src/review/README.md:1-18`).

**Rebuild stance.** keep-not-yet-ported — `04-architecture.md:138`: "Port the three-stage policy
(thresholds re-based on met days)". Absent from `app-next` (checked `app-next/src/features` and
`app-next/src/ports`).

---

## 22. Analytics, experiments, observability

**Analytics** (`app/src/analytics/`): the app's **only** emitter; accepts only names/payloads from
`@excerlock/analytics-events` and applies that registry's transmission allowlist at the final
boundary. PostHog SDK policy is explicitly locked down — app-lifecycle capture, UI autocapture,
exception autocapture, surveys, GeoIP, heatmaps/session replay and retries are all **off**; screen
tracking accepts only the fixed `FlowScreen` registry so a condition or gym name can never become a
`$screen_name`. `privacyPolicy.ts` drops undeclared keys, so health, motion, location, workout
metrics, balances and screen-time answers stay on device. Missing config leaves the no-op sink
installed so analytics cannot crash startup. `flush()` is awaited before account deletion;
`discardPending()` durably removes queues when server erasure already happened
(`app/src/analytics/README.md:1-38`).

**Experiments** (`app/src/experiments/`): typed flag names (`exp-` experiments, `gate-` release
gates), control-first selection with a **500 ms budget** after which a late treatment cannot rotate
copy client-side; no file outside `ExperimentVariantProvider.tsx` may call `useFeatureFlag`; the only
registered experiment is `exp-shield-copy-v1`, whose payload must be a complete four-cause
title/subtitle set (`app/src/experiments/README.md:1-20`).

**Observability** (`app/src/observability/`): `scrubSentryEvent` removes user, request, message,
custom context, tags, transaction/fingerprint, breadcrumb content, exception messages, mechanism data
and stack-frame variables/source context; replay, screenshots, view hierarchy, failed-request capture,
sessions, interactions and performance tracing are off; native crash handling stays on; the Sentry
import must remain the first import in `app/index.ts`
(`app/src/observability/README.md:1-18`).

**Rebuild stance.** keep-not-yet-ported. `04-architecture.md:133` — port analytics + experiments +
`packages/analytics-events`, update `FLOW_SCREENS`, `distinct_id` = Supabase uid.
`04-architecture.md:134` — port observability **verbatim**. `app-next` has
`src/ports/AnalyticsPort.ts` + `src/demo/fakes/AnalyticsFake.ts`; no Sentry scrub and no experiment
rail (checked `app-next/src`).

---

## 23. On-device test harness (physical-device signal recorder)

**What the user could do.** Open a hidden harness app on a real phone, pick a declared test, run a
countdown, press labelled truth markers while walking/propping, and export a JSON Lines run.

**Where it lived.** `app/src/harness/` (`HarnessRunEngine.ts`, `HarnessRunStore.ts`, `HarnessApp.tsx`,
`HarnessBuildRoot.tsx`, `HarnessCameraSource.ts`, `HarnessCameraRuntime.tsx`,
`PlacementHarnessSignalSource.ts`, `createDefaultHarnessSources.ts`, `harnessLaunchRequest.ts`,
`testDefinitions.ts`, `sources/`), analyzer `scripts/analyze-harness-run.js`
(`app/src/harness/README.md:20-32`).

**The nine declared tasks** (`app/src/harness/testDefinitions.ts:39-161`):
`marker-only`, `M2` walking outdoors phone in hand, `M4` treadmill walking phone in hand (with a
`treadmillSpeedMph` parameter), `M6` standing still scrolling, `M7` sitting scrolling, `P3` placement
sensor only on a running belt, `t1-propped-flow` the full prop→confirm→pick up→set down flow,
`c1-treadmill-walking`, `c2-empty-running-belt`. The README maps each to the product step it proves
(`app/src/harness/README.md:80-88`). Note: Johan's standing rule is to describe these by the action,
not the code (memory: "Describe tests by action").

**Edge cases and design.**
- Harness storage is **separate from product storage** (`README.md:9-11`).
- Cheap motion/placement sources attach to every run; camera sources attach only when declared, and
  are never prepared or started otherwise (`:11-13`, `:43-48`).
- Camera sources may prepare during the countdown so the preview is live before the hands-free window
  (`:46-48`).
- The motion adapter records provider payloads unchanged as `raw.activity`/`raw.cadence` and runs the
  **production** `WalkVerifier` with no session/unlock/lease callback, recording verdicts as
  `derived.verdict` (`:15-19`).
- Placement source decorates the production provider and classifier, recording raw device motion and
  classification (with pickup/set-down transitions) on separate tracks (`:34-40`).
- Harness capture writes 640×480 H.264 at 15 fps to Application Support; the run retains the sandbox
  URI locally, but `serializeHarnessJsonLines` **strips it** from exports, and one delete action
  removes every movie and strips retained URIs (`:49-55`).
- Run context records every declared parameter, preserving a blank value rather than inventing one,
  plus a free note (`:57-62`).
- **Mac-driven launch**: `excerlock://?test=<id>&start=1` via `devicectl`; the path must stay `/` or
  expo-router swallows it; a cold launch can drop the url before JS listens, so open the app first and
  send the url to the running app (`:64-78`).
- The analyzer treats every unique `source`+`track` pair as a layer and prints, per marker, the first
  sample from each layer with elapsed time, printing `never responded` for a missing sample and
  reporting empty/incomplete runs explicitly (`:24-32`).
- Definition validation rejects duplicate ids, unlabelled markers, non-positive durations, negative
  countdowns and duplicate parameter ids (`testDefinitions.ts:5-37`).

**Rebuild stance.** keep-not-yet-ported, explicitly named by Johan — `04-architecture.md:130`: port
`app/src/harness/**`, `app/src/diagnostics/**`, `scripts/analyze-harness-run.js` and
`tools/gait-fixture-extractor` as a **separate app root behind `EXPO_PUBLIC_TEST_HARNESS=1`**, citing
B12 ("all that harness stuff we tested need to keep"). Absent from `app-next` (checked
`app-next/src`; there is a `src/features/dev` dev menu but no harness).

---

## 24. On-device diagnostics recorder

**What it was.** An append-only ring buffer with AsyncStorage persistence, readable **on the phone**,
because device tests happen where the Mac is not — on a treadmill, on a walk with no Wi-Fi, with the
app backgrounded, force-quit and rebooted, where `console.log` goes nowhere
(`app/src/diagnostics/README.md:5-11`).

**Edge cases.** Recording is **synchronous** — `append` never awaits, because a walk produces a cadence
sample about every second and storage I/O inside a sensor callback would put the recorder in the path
of the thing it measures; persistence is a periodic flush plus a flush when the app backgrounds, the
moment before iOS may suspend or kill the process (`:23-29`). Instrumentation **decorates, never
rebuilds** (see §4's dependency-drift bug) (`:31-36`). Gated behind `EXPO_PUBLIC_DIAGNOSTICS=1`, and
the route redirects home when the flag is absent; must be a **Release** build so the JS bundle is
embedded and the app runs with no Metro and no network (`:38-50`).

**Rebuild stance.** keep-not-yet-ported (bundled with the harness in `04-architecture.md:130`).
Absent from `app-next`.

---

## 25. E2E scenario runtime and debug menu

**E2E** (`app/src/e2e/`): a build-gated composition root that statically bundles manifests from
`app/e2e/scenarios`, validates their complete fixture × clock × app-state contract, resolves all five
SignalKit fixtures through `SIGNAL_FIXTURE_CATALOG`, and loads from
`excerlock://e2e/scenario/<name>`. Only the root layout may read `EXPO_PUBLIC_E2E`; screens never
branch on the flag; a production-bundle guardrail proves the module's canary is absent when the flag
is unset (`app/src/e2e/README.md:1-16`). Only three scenarios were ever built:
`baseline-fresh-install`, `balance-drain`, `screentime-permission`
(`app/src/e2e/scenarioCatalog.ts:8-12`).

**Debug menu** (`app/src/debug/`): dev/TestFlight-only switchboard for fixtures, flags, entitlement,
onboarding reset and the analytics console; App Store builds compile it out
(`app/src/debug/README.md:1-7`). The Settings entry sits inside a literal `__DEV__` branch
(`app/src/settings/README.md:25-26`).

**Rebuild stance.** `04-architecture.md:131` — "Port the idea" into the dev-menu scenarios in Phase 1
and keep deep-link entry in Phase 2; Maestro is banned. This is **keep-and-ported-already**:
`app-next/src/demo/scenarios/` implements 24 required scenarios (`04-architecture.md:103-108`) and
`app-next/src/features/dev/` is the dev menu.

---

## 26. Settings

**What the user could do.** Set the Walk & Scroll stop grace (30 s, or 1–5 min — `null` until chosen,
matching an empty picker); read the app-fixed cadence (~60–70 steps/min) and the 15-minute unlock
increment as read-only facts *with the reason each is fixed*; manage account; support & feedback;
notification switches; gym auto-detect opt-in; debug entry under `__DEV__`
(`app/src/settings/README.md:6-26`). Files: `app/src/settings/screens/SettingsScreen.tsx`,
`components/GracePeriodPicker.tsx`, `components/SettingsRow.tsx`, `store/settingsStore.ts`.

**Rebuild stance.** keep-and-ported-already at the surface level —
`app-next/src/features/settings/` exists with `SettingsScreen.tsx`, `PreferencesPanel.tsx`,
`GymsScreen.tsx`. The old settings' *content* is partly cut (allowance, engagement notification
toggles).

---

## 27. Design system, branding, OTA, runtime selection

- **UI** (`app/src/ui/README.md:1-72`): a dark full-bleed gradient system (`#1A0F06 → #C2570A`
  screen, a seven-stop dashboard gradient, a night gradient for lock/shield screens), translucent
  borderless cards, white glyph PNGs tinted at render. **Retired** — `04-architecture.md:140` and F
  (line 83: "the old Pillow, blue-violet and orange-gradient visual systems"). The rebuild is a white
  canvas with a pale-orange top wash (C1, line 47).
- **Branding** (`app/src/branding/README.md:1-56`): app icon and splash contract, with two constraints
  that are easy to break — **the icon must have no alpha channel** (Apple rejects the binary
  otherwise; a guardrail reads the PNG IHDR color type because a config assertion cannot see this),
  and **the splash background is a solid color** because SDK 57's `expo-splash-screen` centers a logo
  on a `backgroundColor` and a full-bleed image needs the deprecated
  `enableFullScreenImage_legacy`. **Undecided** in the rebuild plan — not named in `00-decisions.md`
  or `04-architecture.md` §5 — but these two constraints apply to any Expo iOS app and are worth
  carrying.
- **Updates** (`app/src/updates/README.md:1-22`): EAS Update channels `preview`/`production`, plus the
  release-style `e2e` simulator profile; compatibility derived from the public app version, so any
  native change requires a new store binary before OTA JS using it. **Undecided** in the plan.
- **Runtime selection** (`app/src/runtime/README.md:1-11`): one seam,
  `shouldUseNativeIosRuntime`, keyed on the **Expo Go host version** rather than `expoGoConfig`,
  because embedded manifests can make `expoGoConfig` non-null in a real Release binary. Keeping the
  decision in one place stops camera, motion, placement, HealthKit and Screen Time drifting into
  different definitions of "native build". The rebuild's equivalent is `app-next/src/runtime/`
  choosing Fake vs Real (`04-architecture.md:50`) — same idea, different axis. **Undecided**;
  the Expo-Go-host-version detail is a real trap worth porting.

---

## 28. Vendor integrations (Strava, Whoop, Polar, Oura, Hevy, Concept2)

**Where it lived.** `app/src/signals/vendor/` (fixtures only on device; normalization was the server
proxy's job) (`app/src/signals/vendor/README.md:1-12`), plus server routes named in
`04-architecture.md:142`.

**Edge cases the fixtures encoded.** Strava recorded vs manual vs trainer activities, Whoop
`PENDING_SCORE`, Polar's missing manual flag, Oura daily activity, all-disconnected baseline
(`app/src/signals/vendor/README.md:9-12`). Raw payloads were never persisted and earning was evaluated
on-device (`:4-5`).

**Rebuild stance.** **cut** (B10 line 31, D6 line 65, F line 82, `04-architecture.md:126`, `:142`).

---

## 29. App Intents target

`app/targets/app-intents` exists alongside the three Screen Time targets. No README under
`app/src` describes it, and `plans/rebuild/00-decisions.md` F (line 83) explicitly puts
**Siri/App Intents** out of v1. Stance: **cut**.

---

# Edge cases the old app handled that `app-next` has no equivalent for

This is the list to act on. Each row is a behaviour proven or reasoned in `app/`, with nothing
matching it under `/Users/johansardar/ExcerLock/app-next/src` (checked `src/ports`, `src/domain`,
`src/demo`, `src/features`).

| # | Edge case | Old-app anchor | Why it matters |
| --- | --- | --- | --- |
| 1 | **Renewable 15-minute OS-side lease, non-extensible once lapsed** | `walkingSessionController.ts:442-500`; `app/src/screentime/native/README.md:25-32` | The only mechanism that re-shields when the app is force-quit mid-walk. `app-next/src/ports/WalkingPort.ts` has no lease concept. |
| 2 | **Lease expiry evaluated on read, not only on timer** | `walkingSessionController.ts:108-116`, `:476-500` | A suspended app must not report stale "still walking". |
| 3 | **Walk-lease warning notification 30 s before expiry, only when already approved, never prompts, cancels on renew** | `app/src/notifications/walkLeaseWarning.ts:12-41` | B14 keeps this notification; the discipline around it is undocumented in `app-next`. |
| 4 | **Cadence freshness (5 s) + two consecutive qualifying samples + 65 spm threshold** | `app/src/signals/motion/constants.ts:5-17`; `WalkVerifier.ts:75-118` | The anti-phantom-steps rule. Nothing in `app-next` encodes it. |
| 5 | **Automotive activity and denied motion auth disqualify immediately** | `WalkVerifier.ts:55-57`, `:67-69` | Driving must never read as walking. |
| 6 | **Stop grace anchored to the activity sample's `startedAt`, not "now"** | `WalkVerifier.ts:120-140` | Prevents a late classification from extending access. |
| 7 | **Grace period validated to the 30 s–5 min band (throws outside)** | `WalkVerifier.ts:30-38` | `app-next` settings expose a grace but no validation seam I found. |
| 8 | **Propped phase machine: 20 s pickup cadence grace, 60 s set-down handoff window, set-down pauses the exit path** | `walkingSessionController.ts:30-31`, `:376-440` | The whole treadmill hand-off feel. `app-next/src/features/unlock/gait/TreadmillScanController.ts` is scan-only. |
| 9 | **Camera permission denied mid-scan → silently start handheld verification before the user dismisses the sheet** | `TreadmillScanCoordinator.ts:25-28` | A denial must not strand the user in a locked state. |
| 10 | **30-second framing grace after a failed 5-second gait scan** | `TreadmillScanController.ts:8`, `:128-152` | Bad framing is the common case on a console. |
| 11 | **Geofence 30-second arrival confirmation debounce, cancelled by an exit inside the window** | `GeofenceEventProcessor.ts:4`, `:28-56` | The `region-blip` case — driving past the gym must not unlock. `app-next`'s `GymPort.checkIn` takes a `{milliseconds, signal}` but nothing owns the exit-cancels rule. |
| 12 | **Coordinate-free, idempotent visit log claimed at app open after a headless background task** | `app/src/signals/location/README.md:36-49`; `gymPresenceController.ts:175-210` | Arrivals while the app was killed. Nothing equivalent in `app-next`. |
| 13 | **`Always` permission requested only from an explicit opt-in; runtime reconciliation quietly no-ops without it** | `gymPresenceController.ts:112-139` (`:133`) | Apple review + user trust. |
| 14 | **5-gym cap and 50/100/200 m radius band asserted in code** | `gymRegions.ts:3-27` | iOS caps monitored regions; exceeding it fails silently. |
| 15 | **HealthKit: manual (`wasUserEntered`) samples excluded; `appleExerciseTime` and workout durations never summed; `authorized` ≠ granted-per-type** | `app/src/signals/health/README.md:6-8`, `:22-24`, `:32-36` | Cheating and double counting. |
| 16 | **HealthKit background delivery is best effort; force-quit stops JS delivery, so no instant-unlock promise** | `app/src/signals/health/README.md:26-30` | Shapes the copy on the unlock moment. |
| 17 | **Screen Time runtime misidentification fails toward native; Standalone+ExpoGo metadata throws at startup** | `app/src/screentime/README.md:45-61` | Prevents shipping a build that simulates blocking. |
| 18 | **Monitor registration failure applies the shield before returning the error (fail closed)** | `app/src/screentime/native/README.md:30-32` | Never fail open on a blocking app. |
| 19 | **Stale persisted selection handle degrades to "choose your apps"** | `app/src/screentime/README.md:41-43` | Survives an OS-side selection invalidation. |
| 20 | **Shield content written to the app group with cause committed after context; lock-window context written natively because JS may be suspended** | `app/src/shield/README.md:25-40` | The shield shows wrong copy otherwise. |
| 21 | **ShieldAction collapses to a single "Close" when notification permission is absent (no dead route home)** | `app/src/shield/README.md:66-73` | An action button that does nothing is worse than none. |
| 22 | **Support: `submitting` at interruption is restored as failed-with-reason, never forever-sending; explicit 4xx/5xx/timeout/invalid-receipt taxonomy** | `app/src/support/README.md:32-42` | `app-next/src/ports/SupportPort.ts` exists; the state law does not. |
| 23 | **Account deletion ordering: PostHog flush → server DELETE → discard queued → PostHog reset → Adapty logout → auth sign-out last; `410` is terminal** | `app/src/account/README.md:57-66`, `:102-105` | `04-architecture.md:135` says keep this law; nothing in `app-next` carries it. |
| 24 | **Notification delivery caps that survive restart (rolling 7-day ceiling persisted; deterministic ids; taps validated against id + route)** | `app/src/notifications/README.md:76-104` | Even reduced to two notifications, the deterministic-id and tap-validation parts still apply. |
| 25 | **Analytics transmission allowlist that drops undeclared keys at the final boundary, and screen names restricted to a fixed registry** | `app/src/analytics/README.md:3-22` | The only thing stopping a gym name reaching PostHog. Absent from `app-next/src/ports/AnalyticsPort.ts`. |
| 26 | **Sentry event scrub (messages, breadcrumbs, frames, tags) with the Sentry import first** | `app/src/observability/README.md:5-11` | `04-architecture.md:134` says port verbatim; not present. |
| 27 | **Fixture manifests that fail at load on unknown events / invalid timelines / non-JSON payloads** | `app/src/signals/README.md:14-18` | `app-next` scenarios are plain objects; a malformed scenario fails later and less clearly. |
| 28 | **Named adversarial fixtures: `shaky-cheat`, `red-light`, `late-classification`, `drive-off`, `region-blip`, `manual-entry-day`, `re-arm-race`** | `app/src/signals/{motion,location,health,screentime}/README.md` | These are the test corpus for every anti-cheat rule above. |
| 29 | **On-device harness + diagnostics (synchronous append, flush on background, decorate-never-rebuild)** | `app/src/harness/README.md`; `app/src/diagnostics/README.md:23-36` | B12 explicitly keeps these; neither exists in `app-next`. |
| 30 | **Runtime selection keyed on the Expo Go host version, not `expoGoConfig`** | `app/src/runtime/README.md:5-9` | An embedded manifest can make `expoGoConfig` non-null in a real Release binary — a silent "we're in Expo Go" bug in production. |
| 31 | **App icon must have no alpha channel (guardrail reads PNG IHDR)** | `app/src/branding/README.md:44-50` | Apple rejects the binary; a config assertion cannot catch it. |
| 32 | **Review policy: 30-minute post-shield cooldown, permanent stop flags, manual row opens the store URL rather than the in-app prompt** | `app/src/review/README.md:5-18` | `04-architecture.md:138` says port it; absent from `app-next`. |
| 33 | **DST / midnight-crossing window math with a single local-wall-clock conversion at the edge** | `app/src/lock/README.md:83-93`; `app/src/schedule/README.md:28-40`; `walkingSessionController.ts:506-527` | `app-next` has a `window-crosses-midnight` scenario but no DST corpus. |

---

# Things the old app never proved (carry the caveat, not the confidence)

- Shield **enforcement** — whether a shield actually blocks an app — was never observed; the simulator
  cannot show it (`app/src/screentime/native/README.md:72-75`, `app/src/shield/README.md:77-81`).
- The Screen Time **deny path** cannot be exercised on a simulator, because authorization completes
  silently there (`app/src/screentime/README.md:85-94`).
- Core Motion delivers **nothing** on a simulator (error 104, sensor backend absent), so no Walk &
  Scroll path past the availability gate can run there
  (`app/modules/excerlock-motion/README.md:59-92`).
- Real **geofence relaunch** and whether the headless task gets enough execution time to finish the
  30-second debounce were never established (`app/src/signals/location/README.md:52-58`).
- **HealthKit** reads, cold-launch delivery and the resulting payout were never verified on a device
  (`app/src/signals/health/README.md:41-44`).
- **Gait vision** framing, Vision throughput and front-camera orientation are device-unverified
  (`app/src/home/treadmill/README.md:17-18`; `app/modules/excerlock-gait-vision/README.md:20-22`).
- No real **StoreKit sandbox purchase** and no entitlement observed round-tripping through Adapty
  (`app/src/subscription/README.md:117-121`).
- **Share card** native capture and the iOS share sheet were never run
  (`app/src/shareCards/README.md:87-89`).
- **Haptic feel** on physical hardware unverified (`app/src/analysis/milestones/README.md:116-119`).

---

# Quick disposition table

| Capability | Old path | Stance |
| --- | --- | --- |
| Screen Time auth / picker / shields / schedules | `app/src/screentime/**`, `app/targets/**` | keep-not-yet-ported |
| Lock precedence | `app/src/lock/model/lockPrecedence.ts` | cut/replace (`domain/resolveLock`) |
| Shield extension content | `app/src/shield/**`, `targets/Shield*` | keep-not-yet-ported (causes reduced to 3) |
| Walking session + WalkVerifier + lease | `app/src/home/signals/walkingSessionController.ts`, `app/src/signals/motion/**` | keep-not-yet-ported |
| Treadmill camera + placement | `app/src/home/treadmill/**`, `app/src/signals/{gait,placement}/**`, `modules/excerlock-gait-vision` | keep-not-yet-ported (UI already in `app-next/src/features/unlock`) |
| Pedometer / Core Motion module | `app/modules/excerlock-motion` | keep-not-yet-ported |
| Geofence + manual check-in + visit log | `app/src/signals/location/**`, `app/src/home/signals/gymPresenceController.ts` | keep-not-yet-ported (+ new map search) |
| HealthKit | `app/src/signals/health/**`, `app/plugins/withHealthKitBackgroundBootstrap.js` | keep-not-yet-ported (running/biking only) |
| SignalKit fixtures + TimelinePlayer | `app/src/signals/**` | keep-not-yet-ported (idea only in `app-next/src/demo`) |
| Condition builder / edit / off-not-deleted | `app/src/home/builder/**`, `app/src/manage/**` | keep-and-ported-already (rate kind cut) |
| Condition banners (21 painted + own photo) | `app/src/home/banners/**` | undecided → effectively cut |
| Time bank / ledger / drain ladder / Full Lock | `packages/ledger`, `app/src/ledger/**` | cut |
| Global schedules (rest/holiday/override) | `app/src/schedule/**` | cut |
| Recurring lock windows + overlap rejection | `app/src/lock/model/**` | cut as a layer; per-rule window kept |
| Analysis tab (recap, Time Reclaimed, streaks) | `app/src/analysis/**` | keep (heat map + badges cut) |
| Milestones / badges | `app/src/analysis/milestones/**` | cut |
| Share cards | `app/src/shareCards/**` | cut |
| Onboarding rail | `app/src/onboarding/**` | keep-and-ported-already (restructured) |
| Paywall + Adapty | `app/src/subscription/**`, `app/src/paywall/**` | keep logic, replace UI with Paywall Builder |
| Account (Clerk) | `app/src/account/**` | replace with Supabase, keep shape + deletion law |
| Notifications (3 engagement types) | `app/src/notifications/**` | reduce to 2 local |
| Support + feature voting | `app/src/support/**` | keep support, cut voting |
| Review prompts | `app/src/review/**` | keep-not-yet-ported (absent from `app-next`) |
| Analytics + experiments | `app/src/analytics/**`, `app/src/experiments/**` | keep-not-yet-ported |
| Sentry scrub | `app/src/observability/**` | keep-not-yet-ported (port verbatim) |
| Harness + diagnostics | `app/src/harness/**`, `app/src/diagnostics/**` | keep-not-yet-ported (behind `EXPO_PUBLIC_TEST_HARNESS=1`) |
| E2E scenario runtime | `app/src/e2e/**` | keep-and-ported-already as dev-menu scenarios |
| Debug menu | `app/src/debug/**` | keep-and-ported-already (`app-next/src/features/dev`) |
| Vendor integrations | `app/src/signals/vendor/**` | cut |
| Old UI theme | `app/src/ui/**` | cut |
| Branding contract (no-alpha icon, solid splash) | `app/src/branding/**` | undecided (constraints still apply) |
| OTA / EAS channels | `app/src/updates/**` | undecided |
| Runtime native-vs-fixture selection | `app/src/runtime/**` | undecided (trap worth porting) |
| App Intents target | `app/targets/app-intents` | cut (F line 83) |
