# ExcerLock — CONDITIONS / ACTIVITY-DETECTION / APP-BLOCKING AUDIT

Scope: `/Users/johansardar/ExcerLock/app-next` (the active rebuild), branch `rebuild/phase-1`.
Nothing was modified. All paths below are relative to `/Users/johansardar/ExcerLock/app-next` unless absolute.

---

## 0. Frame first: there is no real runtime

`src/runtime/createRuntime.ts:9-18`

```ts
export function createRuntime(mode = process.env.EXPO_PUBLIC_RUNTIME): Runtime {
  if (mode === 'real') throw new Error('Real runtime is unavailable in Phase 1');
  const runtime = FakeRuntime();
  if (Platform.OS === 'ios' && process.env.NODE_ENV !== 'test') {
    runtime.gym = foregroundGym(runtime.gym, runtime.dev.setPresence);
    if (Constants.isDevice) runtime.gait = nativeGait() ?? runtime.gait;
    runtime.support = supportDelivery(runtime.support);
  }
  return runtime;
}
```

- `Runtime.kind` is the literal `'fake'` — `src/runtime/Runtime.ts:16`.
- Everything comes from `FakeRuntime()` — `src/demo/FakeRuntime.ts:24-133`.
- Enforced by test `src/runtime/__tests__/runtime.test.ts:2,5` ("uses the local fake runtime by default", "does not silently activate real services in Phase 1").

### The only three real native seams (physical iOS device only)

| Real thing | Files | What it actually does |
|---|---|---|
| Location | `src/runtime/ForegroundGym.ts`, `src/runtime/NativePlaceSearch.ts`, `modules/expo-local-search/ios/PickerLocationService.swift`, `modules/expo-local-search/ios/PlaceSearchService.swift` | Core Location + MapKit autocomplete. `requestWhenInUseAuthorization` **only** — `PickerLocationService.swift:25`. Accuracy `kCLLocationAccuracyNearestTenMeters` — `:12` |
| Camera / gait | `src/runtime/NativeGait.tsx`, `modules/excerlock-gait-vision/ios/GaitVisionService.swift` | Front camera 640x480 @ 15 fps, `VNDetectHumanBodyPoseRequest` (`:19`) + `VNDetectFaceRectanglesRequest` (`:20`), pose on every other frame |
| Support mail | `src/runtime/SupportDelivery.ts` | `mailto:` |

### What does NOT exist

- No pedometer. No `CMPedometer`, no `CMMotionActivity`, no `expo-sensors`.
- No HealthKit. `HealthPort` is satisfied entirely by scenario fixtures.
- No Screen Time / FamilyControls / DeviceActivity / ManagedSettings. No entitlement, no native module, no dependency.
- No background execution of any kind. No geofencing, no `CLCircularRegion`, no BGTaskScheduler.

`package.json` dependency list (verbatim, `package.json:5-27`): async-storage, datetimepicker, expo, expo-build-properties, expo-constants, expo-dev-client, expo-font, expo-haptics, expo-linear-gradient, expo-linking, expo-router, expo-splash-screen, expo-status-bar, react, react-native, gesture-handler, react-native-maps, reanimated, safe-area-context, screens, svg, worklets, zustand. That is the whole list — nothing sensor-, health-, or Screen-Time-related.

`app.json:12` declares exactly one usage description: `NSLocationWhenInUseUsageDescription`. There is no camera usage description in `app.json`; it is injected by `modules/excerlock-gait-vision/app.plugin.js`.

### Critical consequence: nothing is ever blocked

`ScreenTimePort.applyLock(decision)` — declared `src/ports/ScreenTimePort.ts:7`, implemented as a log line in `src/demo/fakes/ScreenTimeFake.ts:17`. **It has zero call sites in `src/` and `app/`.** `observeUsage` (`ScreenTimePort.ts:8`) is likewise never subscribed by any screen. The entire `LockDecision` machinery drives copy on Home and nothing else.

---

## 1. Condition types — the canonical registry

### 1.1 Canonical unions

`src/domain/types.ts:2`
```ts
export type Activity = 'walking' | 'gym' | 'running' | 'biking';
```

`src/domain/types.ts:14-22` — `RuleMode`, 8 variants:

| # | Line | Mode | Product meaning |
|---|---|---|---|
| 1 | `:15` | `{kind:'target', activity:'walking', metric:'steps', goal, place}` | daily step goal |
| 2 | `:16` | `{kind:'state', activity:'walking', place}` | Walk & Scroll — open only while walking |
| 3 | `:17` | `{kind:'event', activity:'gym', trigger:'arrival'}` | arrive at gym |
| 4 | `:18` | `{kind:'target', activity:'gym', metric:'minutes', goal}` | duration at gym |
| 5 | `:19` | `{kind:'target', activity:'running', metric:'minutes', goal}` | |
| 6 | `:20` | `{kind:'target', activity:'running', metric:'distance', goal, unit}` | |
| 7 | `:21` | `{kind:'target', activity:'biking', metric:'minutes', goal}` | |
| 8 | `:22` | `{kind:'target', activity:'biking', metric:'distance', goal, unit}` | |

`src/domain/types.ts:24` — `export type WalkPlace = 'outside' | 'treadmill' | 'either';`

Supporting types in the same file: `Rule` `:4-12`, `Schedule` `:28-34`, `LockedApps` `:36-40`, `RuleDay` `:44-50`, `WalkingSession` `:52-57`, `GymPresence` `:59-63`, `Permissions` `:84-91`, `UnlockHint` `:93-98`, `LockDecision` `:99-106`.

### 1.2 The activity registry used by the picker UI

`src/content/activities.ts:1-7`
```ts
export const activities = [
  { id: 'walking', title: 'Walking', support: 'Find your daily stride' },
  { id: 'gym',     title: 'Gym',     support: 'Show up for yourself' },
  { id: 'running', title: 'Running', support: 'Make every run count' },
  { id: 'biking',  title: 'Biking',  support: 'Enjoy the ride' },
] as const;
export type ActivityId = (typeof activities)[number]['id'];
```
Consumed by `src/design-system/ChoiceGrid.tsx:2,15-19` -> `src/design-system/ActivityCard.tsx`.

### 1.3 Validation bounds table (the authority on goal ranges)

`src/domain/validateRule.ts`

| Rule | Lines | Bounds |
|---|---|---|
| activity must be one of four | `:20` | `['walking','gym','running','biking']` |
| walking place must be valid | `:24` | `['outside','treadmill','either']` |
| `state` only for walking | `:25-26` | |
| `event` only for gym + `trigger:'arrival'` | `:27-28` | |
| walking steps | `:32-35` | 500-30 000, must be a multiple of 500 |
| gym minutes | `:36-38` | 10-180 |
| running/biking minutes | `:36-38` | 5-300 |
| running distance | `:44-45` | km 0.5-50, mi 0.25-30 |
| biking distance | `:44-45` | km 1-200, mi 1-120 |
| schedule days | `:52-58` | non-empty, 0-6, no duplicates |
| schedule window | `:61-76` | `allDay`, or a range >= 15 minutes (`:73`) |

---

## 1A. BLAST RADIUS — removing `running` and `biking` from `Activity`

**64 files** reference `running` or `biking` (`grep -rl "running\|biking" src app modules`). Three of those are false positives (see the bottom of this section). So **61 real files**, of which **18 are tests**.

### A. Type / domain core (must change first)

| File:line | What |
|---|---|
| `src/domain/types.ts:2` | the `Activity` union |
| `src/domain/types.ts:19-22` | the four `running`/`biking` `RuleMode` variants |
| `src/domain/validateRule.ts:20` | activity allow-list array |
| `src/domain/validateRule.ts:36-38` | minutes min/max (`m.activity !== 'walking'` branch, gym-vs-other) |
| `src/domain/validateRule.ts:39-46` | the entire `metric === 'distance'` branch exists only for running/biking |
| `src/domain/validateRule.ts:41,44,45` | explicit `'running'`/`'biking'` literals |
| `src/content/domain.ts:2` | `verbs: { walking:'Walk', running:'Run', biking:'Bike', gym:'Spend' }` — consumed by `src/domain/ruleName.ts:8` and `src/features/home/statusContent.ts:65` |
| `src/ports/HealthPort.ts:6` | `workoutsToday(kind: 'running' \| 'biking')` — the whole port exists only for these two |
| `src/ports/models.ts:28` | `export type Workout = { kind: 'running' \| 'biking'; minutes; km }` |
| `src/ports/models.ts:24` | `HistoryDay.activity: Record<Activity, number>` (shape shrinks automatically, but fixtures must change) |

### B. Ports / runtime wiring

| File:line | What |
|---|---|
| `src/features/home/progressSync.ts:25-26` | skips gym; requires `permissions.health` for non-walking |
| `src/features/home/progressSync.ts:37-48` | the workout-sum branch (minutes vs km, `1.609344` mi conversion) |
| `src/features/home/progressSync.ts:59-68` | `refresh()` — `Promise.all([workoutsToday('running'), workoutsToday('biking')])` |
| `src/features/home/progressSync.ts:61` | literal `'running'` / `'biking'` |
| `src/demo/fakes/HealthFake.ts:5-13` | entire fake — delete if Health goes |
| `src/runtime/Runtime.ts:23` | `health: HealthPort` member |
| `src/demo/FakeRuntime.ts:17,57` | `HealthFake` import + `health:` wiring |
| `src/features/home/progressContent.ts:55-61` | permission/`needed`-copy ternaries fall through to `health`/`c.healthNeeded` for running/biking |
| `src/features/setup/PermissionPrimer.tsx:42` | `runtime.health.request()` |
| `src/onboarding/setupFlow.ts:14-16` | `branchPermission`: walking->motion, gym->location, **else->health** (the else exists only for running/biking) |

### C. Builder / draft / flow

| File:line | What |
|---|---|
| `src/features/rules/draft.ts:14-16` | `runMode`, `minutes`, `distance` draft fields |
| `src/features/rules/draft.ts:17` | `unit: 'km' \| 'mi'` |
| `src/features/rules/draft.ts:42` | `minutes: activity === 'running' ? 20 : 30` |
| `src/features/rules/draft.ts:43` | `distance: activity === 'biking' ? (mi?5:8) : (mi?2:3)` |
| `src/features/rules/draft.ts:25` | `DraftAction` `setDistance` / `setRunMode` |
| `src/features/rules/draft.ts:77-79` | the final `mode()` fallthrough return — the ONLY producer of running/biking modes |
| `src/features/rules/draft.ts:106-110` | `fromRule` else-branch (`runMode: m.metric`) |
| `src/features/conditions/builderFlow.ts:10-13` | the R1/R2/B1/B2/D branch arm |
| `src/features/conditions/builderFlow.ts:21-22` | `['G2','R2','B2','D']` validity |
| `src/features/rules/goalRange.ts:3-4` | `[5,300]` non-gym minutes, and the whole distance row |
| `src/features/rules/plan.ts:35` | `goalStep` fallthrough `'D' / 'R2' / 'B2'` |
| `src/features/rules/answersDraft.ts:7` | `prefix = activity === 'biking' ? 'bike' : 'run'` |
| `src/features/rules/answersDraft.ts:16-20` | `runMode`/`minutes`/`distance` answer mapping, `:18` `'bikeMode'`/`'runMode'` |
| `src/features/rules/conditionSentence.ts:58-66` | the entire trailing running/biking clause |
| `src/features/rules/rulePreviewModel.ts:32-45` | the entire trailing running/biking preview branch |
| `src/features/rules/RuleScreen.tsx:13` | `BranchStep` union contains `'R1'\|'R2'\|'B1'\|'B2'\|'D'` |
| `src/features/rules/RuleScreen.tsx:25,28-31` | `workoutCopy[step]` lookup and `WorkoutModeScreen`/`WorkoutGoalScreen` dispatch |
| `src/features/rules/WorkoutModeScreen.tsx:15-16` | `d.activity === 'walking' ? 'running' : d.activity` — the walking coercion exists to reuse this screen |
| `src/features/rules/WorkoutModeScreen.tsx:28` | gym-vs-run/bike mode list |
| `src/features/rules/WorkoutGoalScreen.tsx:121-129` | same coercion + `setGymMinutes`/`setMinutes`/`setDistance` dispatch |
| `src/features/rules/OnboardingRuleScreen.tsx:21` | `prefix = activity === 'biking' ? 'bike' : 'run'` |
| `src/features/rules/PlanSummary.tsx:24-25` | walking-only place row (the else covers run/bike) |
| `src/features/rules/ConditionPreview.tsx` | renders `rulePreviewModel` output |
| `src/onboarding/flow.ts:23-39` | `pathFor` — `case 'running'` `:29-31`, `case 'biking'` `:32-34` |
| `src/onboarding/validation.ts:13` | `['walking','gym','running','biking']` allow-list |
| `src/onboarding/validation.ts:23-29` | `['G2','R2','B2','D']` goal validation |
| `src/features/conditions/useBuilder.ts:55` | calls `builderValid` |
| `src/features/rules/scheduleDraft.ts` | unaffected but consumed by the same path |

### D. Content / strings

| File:line | What |
|---|---|
| `src/content/activities.ts:4-5` | the Running and Biking cards |
| `src/content/workoutRules.ts:4-8` | `R1`,`R2`,`B1`,`B2`,`D` titles/bodies |
| `src/content/workoutRules.ts:14-21` | `modes.running`, `modes.biking` |
| `src/content/workoutRules.ts:23` | `presets: { gym:[30,45,60], running:[15,20,30], biking:[20,30,45] }` |
| `src/content/workoutRules.ts:26,28` | `distance:`, `range(min,max,unit)` |
| `src/content/rulePreview.ts:13-16` | `runningTime`, `bikingTime`, `runningDistance`, `bikingDistance` |
| `src/content/conditionPreview.ts:14-17` | `running`, `biking`, `run()`, `bike()` |
| `src/content/domain.ts:2` | `verbs` |
| `src/content/analytics.ts:26` | `activities` map |
| `src/content/analytics.ts:33-34` | `tiles.running`, `tiles.biking` |
| `src/content/settings.ts:76` | `why.health = 'Reads running and biking workouts.'` |
| `src/content/settings.ts:84` | `without.health` |
| `src/content/permissions.ts:12` | health prompt copy |
| `src/content/setup.ts:22-25` | `healthTitle`/`healthBody`/`healthAllow`/`healthDenied` |
| `src/content/setup.ts:61` | `checklist.health` |
| `src/content/welcome.ts:7` | `activities: ['Walking','Running','Cycling','Strength training']` (O03 artwork labels) |

### E. Icons / art

| File:line | What |
|---|---|
| `src/icons/activityLibrary.ts:7-10` | `person-running` path |
| `src/icons/activityLibrary.ts:11-14` | `person-biking` path |
| `src/icons/solidGlyphs.ts:14-15` | `running`, `biking` solid glyphs |
| `src/icons/paths.ts:28-29` | `running`, `biking` utility paths |
| `src/design-system/welcomeTokens.ts:24-25` | `person-running` / `person-biking` tiles in the O03 artwork |
| `src/features/onboarding/control/ActivityTile.tsx:11-12` | name map entries |

### F. Analytics

| File:line | What |
|---|---|
| `src/features/analytics/analyticsModel.ts:59-60` | per-bucket running/biking sums |
| `src/features/analytics/analyticsModel.ts:83-84` | period totals |
| `src/features/analytics/analyticsModel.ts:95-96` | `conditions.running`, `conditions.biking` |
| `src/features/analytics/AnalyticsScreen.tsx:37-38` | the two stat tiles |
| `src/features/analytics/AnalyticsScreen.tsx:61` | activity filter |
| `src/state/todayHistory.ts:17` | `activity: { walking:0, gym:0, running:0, biking:0 }` seed |

### G. Demo fixtures / scenarios

| File:line | What |
|---|---|
| `src/demo/scenarios/runner-distance.ts:3,5` | whole scenario is a running rule + a running workout |
| `src/demo/scenarios/biker-time.ts:3,5` | whole scenario is a biking rule + a biking workout |
| `src/demo/scenarios/multi-rule-overlap.ts:5` | contains a running rule |
| `src/demo/scenarios/base.ts:28-29` | seeded history `running`/`biking` minutes |
| `src/demo/scenarios/index.ts:13-14,38-39` | `scenario11` (runner) and `scenario12` (biker) registration |
| `src/demo/activityHistory.ts:16,38-39` | activity record shape + workout sums |
| `src/demo/validateScenario.ts:32` | persisted-history shape validator |
| `src/ports/models.ts:49` | `Scenario.health?: { workoutsToday: Workout[] }` |

### H. Tests (see section 9 for the full list) — 18 files

### FALSE POSITIVES (do not touch)
- `src/features/launch/BootScreen.tsx:12` — `require('.../running-lock.png')`, the app icon asset.
- `src/features/onboarding/scenes/LoopBrandMark.tsx:8` — `running-lock-primary.png`, brand mark.
- `src/features/subscription/PaywallSlot.tsx:15,26,27,41` — a local `running` ref (re-entrancy guard), unrelated.
- `src/features/onboarding/scenes/HabitLoop.tsx:14,15,137` and `src/features/onboarding/scenes/TrendHero.tsx:34` — use the `running` **icon** as generic "exercise" imagery in the habit-loop story. These would still need an icon substitute if `running` is removed from `IconName`, but they are not condition logic.

---

## 2. The "Detecting walking… / Keep walking. Checking your pace… / 0%" state machine — EXACT

### 2.1 The phase enum

`src/domain/types.ts:52-57`
```ts
export type WalkingSession = {
  ruleId: string;      // the state-mode rule it belongs to
  startedAt: string;
  leaseUntil: string;  // Apple's 15-minute renewable lease; a lapsed lease ends the session
  phase: 'verifying' | 'walking' | 'grace' | 'ended';
};
```
Persisted at `ruleDaysStore.data.walkingSession` (`src/state/ruleDaysStore.ts`).

### 2.2 Every constant and duration

| Constant | Value | Declared | Used |
|---|---|---|---|
| `WALK_VERIFY_MS` | `10000` (10 s) | `src/domain/walking.ts:2` | `src/demo/fakes/WalkingFake.ts:44`; tests `src/features/home/__tests__/walking-sync.test.ts:31,88` |
| `WALK_LEASE_MS` | `900000` (15 min) | `src/domain/walking.ts:3` | `src/demo/fakes/WalkingFake.ts:46,52` |
| stop grace | user setting, default **30 s**, range **30-300 s** | default `src/state/settingsStore.ts:14`; validator `:27`; type `:8` | `src/demo/fakes/WalkingFake.ts:55` (`stopGrace * 1000`) |
| grace option labels | `['30 seconds','1 minute','2 minutes','3 minutes','5 minutes']` | `src/content/settings.ts:49` | `src/features/settings/PreferencesScreen.tsx:30` |
| grace option seconds | `[30, 60, 120, 180, 300]` | `src/features/settings/PreferencesScreen.tsx:19` | `:34,36,66` |
| derived step rate | `1.6` steps/second | `src/demo/fakes/WalkingFake.ts:63` and `:85` | steps are computed from elapsed walking seconds, never measured |

### 2.3 `900000` hardcoded (NOT using `WALK_LEASE_MS`) — 4 sites, all in `src/demo/fakes/WalkingFake.ts`

| Line | Code | Meaning |
|---|---|---|
| `:82` | `phase = elapsed >= 900000 ? 'ended' : script.script[index]` | scripted playback hard cap |
| `:83` | `walkedSeconds(script.script, script.stepMs, Math.min(elapsed, 900000))` | scripted playback clamp |
| `:109` | `leaseUntil: new Date(Date.parse(startedAt) + 900000).toISOString()` | **initial lease at `start()`** |
| `:138` | `const leaseUntil = new Date(Date.parse(ctx.clock.now()) + 900000).toISOString()` | **lease granted by `completeProppedScan()`** |

`WALK_LEASE_MS` is imported at `:11` and used only at `:46` and `:52`. If you change the lease, all six sites must move together.

### 2.4 The input signal — this is a dev toggle, not a sensor

`src/demo/fakes/WalkingFake.ts:21`
```ts
const walkingNow = () => ctx.snapshot().motion === 'walking';
```
- `motion` field declared `src/ports/RuntimeControls.ts:20` (`motion: 'walking' | 'still'`).
- Setter `RuntimeControls.ts:31` `setMotion(value)`; implemented `src/demo/FakeRuntime.ts:97`.
- Driven by the Dev menu segmented control — `src/features/dev/DevControls.tsx:27-33`, options from `src/content/sessions.ts:32` (`motions: ['walking','still']`), label `src/content/sessions.ts:31` (`motion: 'Motion'`).
- Scenario seed `src/ports/models.ts:31` (`motion?`), applied `src/demo/FakeContext.ts:25` and `src/demo/FakeRuntime.ts:91`.
- Exposed to the app as `WalkingPort.observeWalking` — declared `src/ports/WalkingPort.ts:8-9`, implemented `src/demo/fakes/WalkingFake.ts:148-158`.

ADR of record: `/Users/johansardar/ExcerLock/docs/adr/0008-walking-sessions-verify-from-motion.md` — line 14 states plainly: *"The Phase 1 runtime has no native pedometer adapter yet: the fake exposes the classification through `dev.setMotion`… a native CMPedometer/CMMotionActivity adapter should sit behind the same port later."*

For **target** (step-goal) rules the number is also synthetic: `src/demo/stepCount.ts:4-15` returns `scenario.steps.today + elapsedSeconds * (scenario.steps.autoIncrementPerSecond ?? 0)`. Exposed via `src/demo/fakes/StepsFake.ts:6,10-15`.

### 2.5 The transition function — `src/demo/fakes/WalkingFake.ts:23-74` (`verify`)

`step()` runs on every clock tick (`ctx.clock.subscribe`) and every context change (`ctx.subscribe`) — subscriptions wired at `:71`.

| From | Line | Condition | To | Side effect |
|---|---|---|---|---|
| `verifying` | `:41` | `!walking` | `verifying` | `walkingSince = null` (restarts the 10 s clock from zero) |
| `verifying` | `:42-47` | walking held `>= WALK_VERIFY_MS` | `walking` | `lease = now + WALK_LEASE_MS` |
| `walking` | `:50-53` | still walking | `walking` | `seconds += dt/1000`; **lease renewed to `now + 900000` every tick** |
| `walking` | `:54-56` | motion stops | `grace` | `graceUntil = now + stopGrace*1000` |
| `grace` | `:58-60` | walking resumes | `walking` | `graceUntil = null` |
| `grace` | `:61` | `now >= graceUntil` | `ended` | |
| any | `:66-69` | `phase === 'ended'` | — | cancels subscriptions |

Per-tick bookkeeping:
- `:63` `detail = { steps: Math.floor(seconds * 1.6), walkingSeconds: seconds, graceUntil: phase === 'grace' ? graceUntil : null }`
- `:64` `writeWalkingProgress(rule, startedAt, tz, base + seconds/60)` -> `src/demo/walkingProgress.ts:4-9` writes minutes into `ruleDaysStore.days` with `met:false, metAt:null`
- `:65` patches `ruleDaysStore.walkingSession` only when `phase` or `lease` actually changed

Entry points:
- `start(rule, options)` `:99-116` — throws unless `mode.kind === 'state' && rule.enabled` (`:100-101`); seeds `phase:'verifying'`, `leaseUntil: startedAt + 900000` (`:109`); **skips `play()` entirely when `options.placement === 'propped'`** (`:114`) — that is the treadmill camera path.
- `resume()` `:117-128` — restores an in-flight session after a cold launch.
- `stop()` `:15-20` — forces `phase:'ended'`.
- `completeProppedScan()` `:134-142` — see section 3.
- Scripted alternative `play()` `:75-97` — used only when `scenario.walking` is set (`:76`), for recordings/demos.

### 2.6 Where each string lives

| String | Source |
|---|---|
| `'Detecting walking…'` | `src/content/home.ts:5` (`detectingWalk`) **and** `src/content/sessions.ts:4` (`verifying`) — two copies |
| `'Keep walking. Checking your pace…'` | `src/content/home.ts:8` (`checkingPace`) |
| `'Checking your pace'` | `src/content/sessions.ts:5` (`verifyingBody`) |
| `'Walking detected'` | `src/content/home.ts:6` (`walkDetected`) **and** `src/content/sessions.ts:6` (`walking`) |
| `'Your apps are open while you walk.'` | `src/content/home.ts:9` (`walkingLive`) **and** `src/content/sessions.ts:7` (`walkingBody`) |
| `'Keep walking to stay unlocked'` | `src/content/home.ts:7` (`keepWalking`) **and** `src/content/sessions.ts:8` (`grace`) |
| `'Your apps stay open while you keep walking.'` | `src/content/home.ts:63` (`walkReady`) — the idle detail |
| `"I'm walking"` | `src/content/home.ts:4` (`walkingEntry`) — the Home button |
| `'Walk complete'` | `src/content/sessions.ts:9` (`ended`) |
| `'Ready when you are'` / `'Start your walk and we'll check your pace.'` | `src/content/sessions.ts:10-11` |
| `'Walk & Scroll'` / `'Start walking'` / `'Stop walk'` / `'Minimize'` / `'Done'` | `src/content/sessions.ts:2,3,12,14,13` |
| `'steps this walk'` / `'minutes walked'` / `'until renewal'` | `src/content/sessions.ts:16,17,15` |
| `'Stop walk'` (Home action) | `src/content/home.ts:52` (`stopWalk`) |

### 2.7 The model that picks the string — `src/features/home/progressContent.ts:16-42`

```ts
if (m.kind === 'state') {
  const mine = session?.ruleId === rule.id && session.phase !== 'ended' ? session : null;      // :17
  const live = !!mine && ['walking','grace'].includes(mine.phase)
               && Date.parse(mine.leaseUntil) > Date.parse(now);                               // :18
  const state = mine?.phase === 'verifying' ? 'verifying' : live ? mine!.phase : 'idle';       // :19
  return {
    title, icon: rule.activity,
    value: live ? 1 : 0,                                                                        // :22  <-- THE PERCENTAGE SOURCE
    detail:  state==='verifying' ? c.checkingPace                                               // :25-31
           : state==='walking'   ? c.walkingLive
           : state==='grace'     ? c.keepWalking
           :                       c.walkReady,
    action: 'walk',                                                                             // :32
    label:   state==='verifying' ? c.detectingWalk                                              // :33-40
           : state==='walking'   ? c.walkDetected
           : state==='grace'     ? c.keepWalking
           :                       c.walkingEntry,
    state,                                                                                      // :41
  } as const;
}
```

### 2.8 What the "0%" is actually computed from

`src/features/home/HomeScreen.tsx:123`
```tsx
<Label variant="support" tone="secondary">
  {`${Math.round(Math.max(0, Math.min(1, model.value)) * 100)}%`}
</Label>
```
For a **state** rule `model.value` is the binary `live ? 1 : 0` from `progressContent.ts:22`. There is no fractional progress toward the 10-second verify — it is 0 % for the entire verifying phase, then 100 %. The bar below uses the same value: `HomeScreen.tsx:126` `<ProgressBar value={...} tone={detected ? 'success' : 'brand'} />`.

For **target** rules the same line renders real fractional progress: `progressContent.ts:65` `value: row.progress / m.goal`.

The status label to the left of the percentage is chosen in `HomeScreen.tsx:78-90`:
```tsx
const status = row.met            ? { label: c.complete,      tone: 'success' }
  : atGym ? (atGym.confirmedAt    ? { label: c.presentGym,    tone: 'success' }
                                  : { label: c.confirmingGym, tone: 'primary' })
  : walk === 'walking'            ? { label: c.walkDetected,  tone: 'success' }
  : walk === 'verifying'          ? { label: c.detectingWalk, tone: 'primary' }
  : walk === 'grace'              ? { label: c.keepWalking,   tone: 'primary' }
  :                                 { label: active ? c.inProgress : c.scheduled, tone: 'primary' };
```
where `walk = 'state' in model ? model.state : 'idle'` (`:77`), `detected = status.tone === 'success'` (`:91`), and the label goes green via `:120` (`color: detected ? t.state.success : t.text.primary`).

**So the literal on-screen row is:** left = `Detecting walking…`, right = `0%`, and directly under it the `detail` line = `Keep walking. Checking your pace…` (`HomeScreen.tsx:125` renders `model.detail`).

### 2.9 The second surface — the Walk & Scroll bottom sheet

`src/features/sessions/WalkingSheet.tsx`
- Phase-to-heading mapping `:63-86` (uses `sessionCopy`, not `homeCopy`)
- Lease countdown `:87-94` via `leaseClock()` from `src/features/home/statusContent.ts:24-27`
- Grace countdown `:95-101`
- Derived step/minute ticker `:102-108`
- Footer buttons `:39-60` — Done / Stop+Minimize / Start
Opened from `src/features/sessions/HomeSheets.tsx:14`, triggered by `HomeScreen.tsx:96-105` (`onWalk`).

### 2.10 What must happen for it to actually unlock

`src/domain/resolveLock.ts:17-23` — `unlockedWalking` requires ALL of:
1. a session exists,
2. `phase` is `'walking'` or `'grace'`,
3. `Date.parse(session.leaseUntil) > Date.parse(now)`,
4. the session's rule is in `active` (enabled AND `isActiveAt(rule, now, tz)`) AND its `mode.kind === 'state'`.

Note `src/domain/progress.ts:7` — `met` is `mode.kind !== 'state' && (...)`. **A Walk & Scroll rule can never mark a day met**; it only ever produces a live lease.

`applyLock` is never called, so no OS-level change occurs at any point.

### 2.11 Auto-start engine

`src/features/home/walkingSync.ts` — mounted `app/(tabs)/_layout.tsx:19`.
- `candidate()` `:16-27` — first enabled `state` rule with a current-or-today window instance
- `consider(edge)` `:28-44` — bails unless `walking` (`:29`), requires `permissions.motion === 'granted'` (`:30`), refuses to replace a live session and only replaces an `ended` one on a rising edge (`:32`), then `runtime.walking.start(rule)` (`:37`) and tracks `'walk_auto_started'` (`:38`)
- Subscriptions `:45-54` — `observeWalking` rising edge (`:46-50`), plus rules/permissions/dev stores

### 2.12 Delete/replace checklist for the walking UI

To swap the current fake for a real pedometer you would replace `WalkingFake` behind `WalkingPort` (`src/ports/WalkingPort.ts:3-12`) and leave everything else intact. To change the copy, edit `src/content/home.ts:5-9,63` and `src/content/sessions.ts:4-11` (they are duplicated). To make the percentage meaningful during verify, `progressContent.ts:22` must return a fraction instead of `live ? 1 : 0` and `WalkingPort.details()` (`WalkingPort.ts:10`) would need to expose elapsed verify time.

---

## 3. `WalkPlace` blast radius — every read of `place`

### 3.1 Declaration and validation
- `src/domain/types.ts:24` — `export type WalkPlace = 'outside' | 'treadmill' | 'either';`
- `src/domain/types.ts:15` — on the walking **target** mode
- `src/domain/types.ts:16` — on the walking **state** mode
- `src/domain/validateRule.ts:24` — allow-list `['outside','treadmill','either']`

### 3.2 Branching reads (the real blast radius)

| File:line | Code | Effect |
|---|---|---|
| **`src/features/unlock/entry.ts:4`** | `if (rule.mode.kind === 'state' && rule.mode.place !== 'outside') return 'treadmill';` | **THE routing decision.** `'treadmill'` AND `'either'` both route to the camera ceremony |
| `src/features/unlock/entry.ts:3` | `if (rule.activity === 'gym' && (kind==='event' \|\| kind==='target')) return 'gym';` | gym routing |
| **`src/features/home/HomeScreen.tsx:74`** | `const kind = unlockKind(rule);` | consumer |
| **`src/features/home/HomeScreen.tsx:93`** | `router.push({ pathname: `/unlock/${kind}`, params: { ruleId: rule.id } })` | **the actual navigation to `/unlock/treadmill`** |
| **`src/features/home/HomeScreen.tsx:130`** | `{kind === 'treadmill' && walk === 'idle' ? <UnlockEntry kind="treadmill" label={c.treadmillEntry} onPress={onAction} /> : null}` | **the "I'm using a treadmill" button** |
| `src/features/home/HomeScreen.tsx:132` | `: kind === 'gym' ? <UnlockEntry kind={kind} .../>` | gym entry |
| **`src/features/sessions/WalkingSheet.tsx:25`** | `treadmill = rule.mode.kind === 'state' && rule.mode.place === 'treadmill'` | strict `=== 'treadmill'` (unlike `entry.ts`) — shows the framing block |
| `src/features/sessions/WalkingSheet.tsx:57` | `disabled={treadmill && !frame.ready}` | blocks Start until propped |
| `src/features/sessions/WalkingSheet.tsx:109-127` | framing block render | |
| `src/features/rules/conditionSentence.ts:46,49` | `place = a.walkPlace !== undefined`; `where = place ? c.places[d.place] : ''` | copy only |
| `src/features/rules/PlanSummary.tsx:25` | `{ label: c.place, value: c.places[draft.place], edit: c.editPlace, step: 'W1' }` | copy only |
| `src/features/rules/WalkingScreen.tsx:37,39` | `selected={d.place === p.id}`, `onAction({type:'setPlace', value:p.id})` | the W1 picker |
| `src/features/rules/draft.ts:9` | `place: WalkPlace` draft field | |
| `src/features/rules/draft.ts:20` | `{ type: 'setPlace'; value: WalkPlace }` | |
| `src/features/rules/draft.ts:36` | `place: 'outside'` default | |
| `src/features/rules/draft.ts:49-50` | `case 'setPlace': return { ...d, place: a.value }` | |
| `src/features/rules/draft.ts:71-72` | writes `place` into both walking modes | |
| `src/features/rules/draft.ts:100` | `fromRule` reads `m.place` | |
| `src/features/rules/answersDraft.ts:13` | `place: (a.walkPlace ?? 'outside')` | onboarding answers |
| `src/features/unlock/UnlockEntry.tsx:13` | `kind: 'gym' \| 'treadmill' \| 'walking'` | |
| `src/features/unlock/UnlockEntry.tsx:38` | `name={kind === 'gym' ? 'gym' : 'walking'}` | treadmill reuses the walking icon |
| `src/demo/scenarioLoader.ts:28` | `{ activity:'walking', place:'outside', walkingMode:'target', goal:5000 }` | scenario seed |
| `src/demo/scenarios/base.ts:7` | default rule mode with `place:'outside'` | |
| `src/demo/scenarios/unlock.ts:3` | `place: 'treadmill'` — the treadmill scenarios | |
| `src/demo/scenarios/walk-state-ready.ts:3` | `place: 'either'` | |
| `src/demo/scenarios/home-walking-session.ts:3` | `place: 'either'` | |
| `src/demo/scenarios/multi-rule-overlap.ts:6` | `place: 'either'` | |

### 3.3 Copy for the three places
- `src/content/rules.ts:5-9` — W1 options: Outside / **Treadmill** / Either, with support lines
- `src/content/conditionPreview.ts:9` — `places: { outside:' outside', treadmill:' on a treadmill', either:'' }`
- `src/content/plan.ts:19` — `places: { outside:'Outside', treadmill:'Treadmill', either:'Outside or treadmill' }`

### 3.4 What `place` does NOT do
`src/features/home/walkingSync.ts` and `src/features/home/progressSync.ts` never read `place`. `src/demo/fakes/WalkingFake.ts` never reads `place` (it takes `options.placement` instead). **A `place: 'treadmill'` on a step-goal (target) rule changes nothing at all** — no routing, no UI, no detection. `place` only matters on a `state` rule.

Note the inconsistency worth flagging: `entry.ts:4` treats `'either'` as treadmill (routes to camera), while `WalkingSheet.tsx:25` treats only `'treadmill'` as treadmill (framing block). A `place:'either'` state rule gets the camera route but not the framing UI.

---

## 4. The treadmill camera flow — end to end

### 4.1 Route
- `app/unlock/treadmill.tsx` — reads `ruleId` and `preview` params, wraps in `UnlockModal`
- Registered `src/features/launch/RootNavigator.tsx:40` — `<Stack.Screen name="unlock/treadmill" options={{ presentation: 'fullScreenModal' }} />`, inside a `Stack.Protected` guard requiring entitlement + completed setup (`:34`)
- Pushed from `src/features/home/HomeScreen.tsx:93`

### 4.2 Entry buttons and "prop up your phone" copy

| Surface | File:line | Copy | Source |
|---|---|---|---|
| Home card button | `src/features/home/HomeScreen.tsx:130` | **"I'm using a treadmill"** | `src/content/home.ts:2` (`treadmillEntry`) |
| Home card walking button | `HomeScreen.tsx:129` | "I'm walking" | `src/content/home.ts:4` |
| Unlock screen title (idle) | `TreadmillUnlockScreen.tsx:92` | **"Prop your phone and walk"** | `src/content/unlock.ts:6` (`treadmill.prop`) |
| Unlock screen body (idle) | `TreadmillUnlockScreen.tsx:99` | "Set it upright facing you. The scan starts on its own once you're walking." | `src/content/unlock.ts:7` (`propBody`) |
| Scanning title | `:90` | "Reading your stride" | `src/content/unlock.ts:8` |
| Scanning body | `:98` | "Keep walking. A few seconds." | `src/content/unlock.ts:9` |
| Framing title | `:89` | "Can't see you" | `src/content/unlock.ts:10` |
| Framing body | `:97` | "Step into frame." | `src/content/unlock.ts:11` |
| Privacy line | `:136-138` | "Processed on this iPhone. Nothing is recorded or sent." | `src/content/unlock.ts:12` |
| Denied title/body | `:87,94` | "Camera access is off" / "Keep your phone with you. Walk & Scroll will verify your steps instead." | `src/content/unlock.ts:13-14` |
| Denied fallback button | `:109-119` | "Continue with phone in hand" | `src/content/unlock.ts:15` (`handheld`) |
| Success overlay | `:131` | "Exercise detected" / "Unlocked while you walk" | `src/content/unlock.ts:16-17` |
| Sheet framing block | `src/features/sessions/WalkingSheet.tsx:111` | **"Prop your phone on the console"** | `src/content/sessions.ts:18` (`framing`) |
| Sheet framing body | same | "Keep your full body in view. The camera preview appears here when connected." | `src/content/sessions.ts:19` |
| Sheet placement labels | `WalkingSheet.tsx:113,125` | "Phone propped" / "Phone in hand" / "Your position is ready" / "Place your phone securely before starting" | `src/content/sessions.ts:20-23` |

### 4.3 The screen — `src/features/unlock/TreadmillUnlockScreen.tsx`

| Line | What |
|---|---|
| `:15` | provider = `preview ? runtime.dev.createGaitPreview() : runtime.gait` |
| `:16` | local snapshot `{ phase:'idle', confidence:0 }` |
| `:20-21` | `lifted = phase==='verified'`, `denied = phase==='permissionDenied'` |
| `:22` | `useCeremony(snapshot.confidence, lifted, 'Exercise detected')` |
| `:23-27` | `close()` — if not verified, `runtime.walking.stop()` |
| `:32-51` | constructs `TreadmillScanController` with `onVerified` / `onPermissionDenied` / `onExpired` |
| `:38` | **`runtime.walking.completeProppedScan()`** on verify |
| `:55-69` | `startScan()` — requires a `state` rule (`:58`), sets `dev.setPlacement('propped')` (`:59`), then `runtime.walking.start(rule, { placement: 'propped' })` (`:60`), then `controller.start()` (`:64`) |
| `:71-75` | **`AppState` listener: leaving `active` calls `controller.stop()`** — hard foreground requirement |
| `:76-82` | cleanup stops the walking session if unverified |
| `:84-85` | `scanning = confidence > 0 && !lifted`; `framing = phase === 'needsFraming'` |
| `:86-99` | title/body selection |
| `:122-125` | `accessibilityRole="progressbar"`, `accessibilityLabel="Scan progress"`, `now: Math.round(snapshot.confidence * 100)` — **the only place a treadmill percentage is exposed, and only to VoiceOver** |
| `:126-133` | `UnlockLockFrame` with the live camera `<Preview />` as its surface |
| Analytics | `:24,30,40,44,48,63` — `unlock_ceremony_done`, `unlock_screen_opened`, `treadmill_scan_verified`, `treadmill_scan_failed` (`reason:'denied'` / `'timeout'`), `treadmill_scan_started` |

### 4.4 The scan controller — `src/features/unlock/gait/TreadmillScanController.ts`

Phases `:6` — `'idle' | 'scanning' | 'needsFraming' | 'verified' | 'permissionDenied' | 'expired'`
Constant `:4` — **`export const GAIT_FAILURE_GRACE_MS = 30_000;`** (the 30-second framing grace)

| Line | Transition |
|---|---|
| `:50-73` | `start()` — publish `scanning`, subscribe to samples, `provider.start()`. A thrown `ERR_GAIT_VISION_DENIED` (`:63`, matcher `:192-194`) -> `permissionDenied` |
| `:80-84` | `beginScan()` — new `GaitPeriodicityDetector({ startedAtMs })`, schedule the 5 s timeout |
| `:86-99` | `process(sample)` — `walking && complete` -> `finishVerified()`; otherwise publish `scanning`/`needsFraming` with the detector's `confidence` |
| `:101-116` | `scheduleScanTimeout()` — fires at `startedAtMs + GAIT_SCAN_TIMEOUT_MS` |
| `:118-142` | `handleScanTimeout()` — if not walking: on the **first** failure set `failureDeadlineMs = now + 30_000` and arm a 30 s timer (`:133-138`); publish `needsFraming`; **restart a fresh 5 s scan** (`:141`). So it re-scans in 5 s cycles for up to 30 s |
| `:144-152` | `finishVerified()` — cleanup, publish `{ phase:'verified', confidence:1 }`, call `onVerified` |
| `:154-162` | `finishExpired()` — publish `expired`, call `onExpired` (which routes back) |
| `:164-184` | `cleanUp()` — clears both timers, unsubscribes, stops the provider |

### 4.5 The detector — `src/features/unlock/gait/GaitPeriodicityDetector.ts`

Exported constants `:3-6`:
```ts
export const GAIT_SCAN_TIMEOUT_MS = 5_000;
export const GAIT_MIN_FREQUENCY_HZ = 1.2;
export const GAIT_MAX_FREQUENCY_HZ = 3;
export const GAIT_REQUIRED_QUALIFYING_STRIDES = 4;
```
Internal thresholds `:8-17`: `LANDMARK_CONFIDENCE_THRESHOLD = 0.6`, `HEAD_CONFIDENCE_THRESHOLD = 0.5`, `MIN_TORSO_HEIGHT = 0.05`, `MIN_HEAD_HEIGHT = 0.05`, `HEAD_SCALE_HISTORY = 15`, `MIN_NORMALIZED_VERTICAL_RANGE = 0.04`, `MIN_VALID_SAMPLES_FOR_SIGNAL = 10`, `MIN_VALID_SAMPLE_RATIO = 0.6`, `LANDMARK_NAMES = ['leftShoulder','rightShoulder','leftHip','rightHip']`.

- `normalizedVerticalPosition` `:61-85` — torso midpoint / torso height when the whole trunk is visible; otherwise head-y scaled by a 15-sample **median** face height. The comment at `:54-59` records the device measurement: *"verified against a console recording: 1.64 Hz head bob at 1.62 steps/s, 2026-09-05"*.
- Peak detection `:144-149` — three-point local maximum.
- `recordPeak` `:173-199` — rejects peaks whose rise above the trough is `< MIN_NORMALIZED_VERTICAL_RANGE` (`:180`); a period inside `[1000/3 - tol, 1000/1.2 + tol]` ms increments `qualifyingStrides`, anything else **resets it to 0** (`:198`).
- `:151-159` — 4 qualifying strides -> `{ classification:'walking', confidence:1, complete:true }`.
- `:208-215` — **`confidence: Math.min(1, qualifyingStrides / GAIT_REQUIRED_QUALIFYING_STRIDES)`** — the value that drives the ring; it moves in quarters.
- `:217-228` — at timeout, classification is `notWalking` only if `validSamples >= 10` and the valid ratio `>= 0.6`; otherwise `insufficientSignal`.

### 4.6 `completeProppedScan` — `src/demo/fakes/WalkingFake.ts:134-142`

```ts
completeProppedScan: () => {
  const session = ruleDaysStore.getState().data.walkingSession;
  if (!session || session.phase === 'ended') return false;
  cancel?.();                                                                   // :137 stop motion-based verification
  const leaseUntil = new Date(Date.parse(ctx.clock.now()) + 900000).toISOString(); // :138
  ruleDaysStore.getState().patch({ walkingSession: { ...session, phase: 'walking', leaseUntil } }); // :139
  cancel = ctx.clock.subscribe(() => { if (ctx.clock.now() >= leaseUntil) stop(); });               // :140
  return true;
}
```
Declared `src/ports/WalkingPort.ts:6`. Significance: after a camera verify the session is pinned to `walking` for a flat 15 minutes with **no further motion checking and no grace phase** — it simply ends when the lease lapses. This is the reason `start()` skips `play()` for `placement:'propped'` (`WalkingFake.ts:114`).

### 4.7 Framing readiness (the non-camera path)
`WalkingPort.treadmillFraming()` — declared `src/ports/WalkingPort.ts:11`, implemented `src/demo/fakes/WalkingFake.ts:159-163`:
```ts
treadmillFraming: () => ({
  ready: ctx.snapshot().placement !== 'handheld',
  placement: ctx.snapshot().placement ?? 'propped',
  message: c.framingBody,
})
```
`placement` is a dev toggle — `src/ports/RuntimeControls.ts:21,34`, `src/features/dev/DevControls.tsx:41-47`, options `src/content/sessions.ts:34`.

### 4.8 Native module
`modules/excerlock-gait-vision/` — `README.md` lines 5-14 state: front camera only, 640x480 @ 15 fps, pose on every other frame, largest body with centrality tie-break, emits only shoulder/hip coords + confidence, **no recording/persistence/transmission/face recognition**, camera permission requested only on first `start()`.
- `ios/GaitVisionService.swift:29-50` — permission gate (`AVCaptureDevice.authorizationStatus`, `requestAccess`), throws `GaitVisionDeniedException` on denial
- `ios/GaitVisionService.swift:266-272` — `AVCaptureDevice.default(..., position: .front)`
- `ios/GaitVisionService.swift:180-199` — sample delegate; `:199` comment: *"A dropped Vision frame is not retained or retried."*
- `src/runtime/NativeGait.tsx:10-32` — the `GaitPort` adapter; `:21-29` `permission()` probes by start/stop
- `src/ports/GaitPort.ts:3-6` — `GaitPort extends GaitVisionProvider` + `Preview` + `permission()`

**`GaitPort.permission()` has no call site in the app.** Camera permission is only ever requested implicitly by `provider.start()`. Camera is absent from the setup primers (`src/features/setup/PermissionPrimer.tsx:10-27` covers only screenTime/motion/health/location).

### 4.9 Simulator/fixture path
`src/demo/fakes/GaitFake.tsx` replays `src/features/unlock/gait/real-walk-single.json` (73 KB of recorded landmarks) through `FixtureGaitVisionProvider` at 15 fps (`:30-33`), gated by `dev.setGait('walking'|'still'|'none')` (`:14-15`, `src/features/dev/DevControls.tsx:22-26`). It runs the **real** detector, so simulator runs exercise the production algorithm.

---

## 5. Gym presence

ADR of record: `/Users/johansardar/ExcerLock/docs/adr/0007-gym-presence-session.md`.

### 5.1 Constants — `src/domain/presence.ts`
```ts
export const PRESENCE_CONFIRM_MS   = 30000; // sustained presence before a visit counts
export const PRESENCE_EXIT_GRACE_MS = 60000; // sustained absence before a confirmed visit ends
export const PRESENCE_RETRY_MS     = 30000; // pause after a failed automatic confirmation
```

### 5.2 Session shape
`src/domain/types.ts:59-63` — `GymPresence { placeId, startedAt, confirmedAt: string | null }`, persisted at `ruleDaysStore.data.gymPresence`.

### 5.3 `ForegroundGym.ts` — the polling loop (not a geofence)

`src/runtime/ForegroundGym.ts`

| Line | What |
|---|---|
| `:6` | `foregroundGym(base: GymPort, presenceChanged)` — decorates the fake with real coordinates |
| `:13-25` | `publish(point)` — presence = `base.listPlaces().some(place => distanceMetres(point, place) <= place.radiusMeters)` (`:16`); notifies only on change (`:21-24`) |
| `:26-30` | `sample(request)` -> `nativePlaceSearch.currentLocation(request)` |
| `:31-44` | **`begin()` — `setInterval(..., 3000)`; a 3-second foreground poll.** Guarded by a `pending` re-entrancy flag |
| `:45-50` | `stop()` — clears the interval only when no observers remain |
| `:56-59` | `distanceTo(id)` from the last sample |
| `:60-68` | `observeLocation` — adds observer, emits last, `begin()` |
| `:69-77` | `observePresence` — same |
| `:78-83` | `checkIn` — re-samples, throws `'Outside saved gym'` if not inside, then delegates to the fake |

Native side: `modules/expo-local-search/ios/PickerLocationService.swift` — `CLLocationManager` (`:5,10`), `kCLLocationAccuracyNearestTenMeters` (`:12`), **`requestWhenInUseAuthorization` only (`:25`)**. There is no `requestAlwaysAuthorization`, no `startMonitoring(for:)`, no significant-location change.

### 5.4 The 30-second arrival confirmation — `src/demo/fakes/GymFake.ts:55-108`

| Line | What |
|---|---|
| `:56` | `ctx.result()` — dev-controllable failure injection |
| `:57` | throws `'Outside saved gym'` unless presence is `inside` |
| `:58` | throws `'Gym not found'` for an unsaved id |
| `:63` | opens the session `{ placeId, startedAt, confirmedAt: null }` |
| `:65-72` | the confirmation race: a `setTimeout(confirmation.milliseconds)` (`:68`) vs. an abort signal (`:70`) vs. a presence subscription that rejects with `'Left gym'` the moment presence leaves (`:69`) |
| `:73-76` | on any failure the pending session is cleared |
| `:78` | re-checks presence after the wait |
| `:79-80` | stamps `confirmedAt` |
| `:81` | `progress.arrive()` — starts the minute clock |
| `:83-108` | marks all enabled gym rules: `event` rules get progress `1` (met); `target` rules keep their accumulated minutes. Uses `applyProgress` (`src/domain/progress.ts:2-8`) |

Callers pass `PRESENCE_CONFIRM_MS`:
- manual: `src/features/unlock/useGymUnlock.ts:112` — `checkIn(nearest.id, { milliseconds: PRESENCE_CONFIRM_MS, signal })`
- automatic: `src/features/home/gymPresenceSync.ts:57` — identical call

### 5.5 Dwell accrual — `src/demo/gymProgress.ts`

| Line | What |
|---|---|
| `:12` | `confirmed = () => !!ruleDaysStore.getState().data.gymPresence?.confirmedAt` |
| `:16-20` | `reconcile()` — **`last = null` (clock paused) whenever loading, presence is `outside`, or the session is unconfirmed** |
| `:23-54` | per-tick accrual: `minutes = (now - last) / 60000` (`:27`), applied to every enabled gym rule (`:31-44`); `event` rules get `1`, `target` rules get `row.progress + minutes` (`:43`) |
| `:45-49` | mirrors the minutes into `history[today].activity.gym` |
| Guard `:24` | returns early unless `last !== null && !loading && presence === 'inside' && confirmed()` |

### 5.6 The app-level engine — `src/features/home/gymPresenceSync.ts`

Mounted `app/(tabs)/_layout.tsx:18`.

| Line | What |
|---|---|
| `:9-15` | header comment: *"Nothing here runs while the app is suspended: background geofencing is a later phase, so the manual 'I'm at the gym' route stays the safety net."* |
| `:25` | `located()` — `['whenInUse','always'].includes(permissions.location)` |
| `:26-35` | `candidate()` — an enabled gym rule with a current-or-today instance that is not yet met |
| `:36-39` | `watching()` — needs saved gyms AND (an open session OR (located AND candidate)) |
| `:40-43` | `nearest()` — sorts saved places by `runtime.gym.distanceTo` |
| `:44-48` | `leave()` — clears the session, tracks `gym_presence_ended` |
| `:49-66` | `confirm()` — one at a time (`:50`), respects `PRESENCE_RETRY_MS` after a failure while still inside (`:51,62`), calls the same 30 s `checkIn` (`:57`) |
| `:67-78` | `onPresence` — `inside` -> confirm; `outside` -> record `outsideSince`, abort in-flight confirmation, drop an unconfirmed session |
| `:79-87` | `reconcile()` — attaches/detaches the presence observer as `watching()` changes |
| `:88-98` | `tick()` — ends a confirmed visit after `PRESENCE_EXIT_GRACE_MS` of sustained absence |
| `:99-101` | `AppState` listener — on returning to `active`, forces one `currentLocation` sample |
| `:102-110` | subscriptions to rules/settings/permissions/ruleDays/dev/clock |

### 5.7 The unlock screen — `src/features/unlock/GymUnlockScreen.tsx` + `useGymUnlock.ts`

Route `app/unlock/gym.tsx`; registered `RootNavigator.tsx:39`.

`useGymUnlock.ts`:
- `:27-31` — nearest place, `distance`, `inside = preview || (presence && distance <= nearest.radiusMeters)`
- `:32-67` — location sampling + presence subscription; losing presence resets progress and tracks `gym_unlock_lost` (`:57`)
- `:68-86` — the visual fill: `setInterval(50ms)` over `preview ? 3000 : PRESENCE_CONFIRM_MS` (`:72`)
- `:87-127` — `unlock()`; when outside it **re-samples location instead of checking in** (`:90-102`)
- `:128-142` — mirrors an engine-confirmed session so both routes share one ceremony (`:129-130`), deriving the ring from `(now - session.startedAt) / PRESENCE_CONFIRM_MS` (`:140`)

`GymUnlockScreen.tsx`:
- `:19-26` — `alreadyCredited` when today is met or a confirmed session exists
- `:28-32` — "Unlocked until {end}" vs "Your gym time is counting"
- `:41-50` — title/body selection
- `:78-81` — `accessibilityRole="progressbar"`, `accessibilityLabel="Presence check"`, `now: Math.round(state.value * 100)`
- `:59` — denied -> `Linking.openSettings()`
- `:61` — no gym -> `router.push('/settings/gyms')`

Copy: `src/content/unlock.ts:19-37` — `'Location detected at the gym'` `:20`, `"Confirming you're here"` `:24` / `'Stay put for a moment.'` `:25`, `'Location not at gym. Go to a selected gym to unlock.'` `:22`, `'Checking your location…'` `:23`.

### 5.8 Every place that assumes foreground

| File:line | Assumption |
|---|---|
| `src/runtime/ForegroundGym.ts:33-43` | `setInterval` — suspended with the app |
| `src/features/home/gymPresenceSync.ts:9-15` | documented foreground-only |
| `src/features/home/gymPresenceSync.ts:99-101` | needs an `AppState` resume to re-sample |
| `app/(tabs)/_layout.tsx:17,18,19` | all three engines are React effects in the tabs layout — unmounted, they stop |
| `src/features/unlock/TreadmillUnlockScreen.tsx:71-75` | explicitly stops the scan when not `active` |
| `src/demo/gymProgress.ts:18,24` | driven by the fake clock, which only ticks while observed (`src/demo/clock.ts`) |
| `modules/expo-local-search/ios/PickerLocationService.swift:25` | when-in-use only — background updates are not even permitted |

### 5.9 The misleading "Auto-detect arrivals" toggle
- UI: `src/features/settings/PreferencesScreen.tsx:69-77` — title `settingsCopy.auto` (`src/content/settings.ts:50`), body `:51` *"Always location lets your saved gym recognize a visit while ExcerLock is closed."*
- Handler: `runtime.gym.enableAutoDetect()` / `disableAutoDetect()`
- Implementation: `src/demo/fakes/GymFake.ts:110-123` — prompts, then sets `permissions.location = 'always'` and `settings.gymAutoDetect = true`
- **Nothing consumes either value for background monitoring.** `foregroundGym` spreads `...base` (`ForegroundGym.ts:52`) so this stays the fake. The native layer never requests Always. The only visible effect is the Home card suffix `'Auto-detect on' / 'Auto-detect off'` — `src/features/home/progressContent.ts:49`, strings `src/content/home.ts:56-57`.
- Also note: `PreferencesScreen` is an orphaned route (section 8), so this toggle currently has no navigation path.

### 5.10 Gym radius
`SavedPlace.radiusMeters` — `src/ports/models.ts:19`. Clamped on save to 50-200 m, rounded to 10 m: `src/demo/fakes/GymFake.ts:47`. Store validator allows 1-10000 (`src/state/settingsStore.ts:23`). Five-gym cap: `GymFake.ts:43`, copy `src/content/settings.ts:57`.

---

## 6. App blocking / Screen Time — the full user path

### 6.1 The type
`src/domain/types.ts:36-40`
```ts
export type LockedApps = {
  handle: OpaqueSelectionHandle | null; // never contains app names or bundle ids
  appCount: number;
  categoryCount: number;
};
```
`OpaqueSelectionHandle` — `src/domain/types.ts:1` (`{ readonly token: string }`).
Stored at `rulesStore.data.lockedApps` (`src/state/rulesStore.ts`).

### 6.2 The port
`src/ports/ScreenTimePort.ts`
```ts
authorizationStatus(): PermissionStatus;               // :4
requestAuthorization(): Promise<PermissionStatus>;     // :5
presentAppPicker(): Promise<LockedApps>;               // :6
applyLock(decision: LockDecision): void;               // :7   <-- ZERO CALL SITES
observeUsage(cb: (minutes: number|null) => void): Unsubscribe; // :8  <-- ZERO CALL SITES
```
Fake: `src/demo/fakes/ScreenTimeFake.ts` — `:8` status, `:9` request, `:10-16` picker, `:17` `applyLock` logs only, `:18-28` `observeUsage` replays `scenario.usageMinutesToday`.

### 6.3 The picker is a fake bottom sheet, not `FamilyActivityPicker`

`src/demo/fakes/ScreenTimeFake.ts:10-16`
```ts
presentAppPicker: async () => {
  const initial = rulesStore.getState().data.lockedApps;
  const result = await ctx.prompt({ kind: 'picker', initial });
  const selected = typeof result === 'boolean' ? initial : result;
  rulesStore.getState().patch({ lockedApps: selected });
  return selected;
}
```
- `ctx.prompt` — `src/demo/FakeContext.ts:41-45`; resolved by `resolve` `:46-51`
- Prompt type — `src/ports/RuntimeControls.ts:4-5` (`{ kind:'picker'; initial: LockedApps }`)
- Host — `src/features/permissions/FakePromptHost.tsx`
- UI — `src/features/sheets/FakeAppPicker.tsx` (a `BottomSheet`, `:21-25`)
- Fictional catalog — `src/content/pickers.ts:7-18`: 4 categories (Social, Games, Video, Messaging) + `App A`…`App F`
- Sheet title `'Choose apps to block'` — `src/content/pickers.ts:2`
- Selection helpers — `src/features/sheets/selection.ts`: `toggleSelection` `:4-6`, `finishSelection` `:7-15` (derives `appCount` from the `app-` prefix, mints a `local-…` token, keeps the real ids in a module-level `Map` at `:3`), `restoreSelection` `:16-22`

### 6.4 The full user path to pick apps — every entry point

| # | Where | File:line | Row title | Source of title |
|---|---|---|---|---|
| 1 | **Setup step X2** | `src/features/setup/AppsSetup.tsx:14-22` (`choose()`), button `:30` | "Choose apps" | `src/content/setup.ts:16` |
| | X2 heading | `AppsSetup.tsx:25` | "Which apps should wait?" / "Choose the apps and categories you want to unlock with movement." | `src/content/setup.ts:14-15` |
| | routed from | `src/features/setup/SetupRoute.tsx:43` | | |
| 2 | **Home** | `src/features/home/HomeScreen.tsx:188` (`onPress={chooseApps}` -> `:57`) | **"Lock list"** | `src/content/home.ts:49` (`lockedApps`) |
| 3 | **Home status action** | `HomeScreen.tsx:61` (`status.action === 'apps'`), label `:67` | "Choose apps" | `src/content/home.ts:27` |
| 4 | **Conditions tab** | `src/features/conditions/ConditionsScreen.tsx:68` | **"Lock list"** — hardcoded string literal, NOT from a content module | inline |
| 5 | **Settings -> Preferences** | `src/features/settings/PreferencesScreen.tsx:86` | "Locked apps" | `src/content/settings.ts:53` (`apps`) — orphaned route, see section 8 |

Screen Time **authorization** (separate from picking) is requested at:
- `src/features/setup/PermissionPrimer.tsx:40` (setup X1)
- `src/features/home/HomeScreen.tsx:60` (`status.action === 'permission'`, label "Allow Screen Time" `src/content/home.ts:25`)

### 6.5 Every place a COUNT is rendered

The formatter: `src/content/pickers.ts:19-20`
```ts
counts: (apps: number, categories: number) =>
  `${apps} ${apps === 1 ? 'app' : 'apps'} · ${categories} ${categories === 1 ? 'category' : 'categories'}`,
```

| # | File:line | Context |
|---|---|---|
| 1 | `src/features/sheets/FakeAppPicker.tsx:27-32` | live count inside the picker sheet |
| 2 | `src/features/setup/AppsSetup.tsx:28` | setup X2 — `<Label>{pickerCopy.counts(selection.appCount, selection.categoryCount)}</Label>` |

Related count-derived logic (no visible number, but reads the counts):
| File:line | What |
|---|---|
| `src/features/setup/AppsSetup.tsx:34` | Continue disabled when `appCount + categoryCount === 0` |
| `src/features/setup/SetupComplete.tsx:28` | X5 checklist "Apps selected" tick (`src/content/setup.ts:58`) |
| `src/features/home/statusContent.ts:55-56` | `noAppsSelected` state -> subtitle "Choose the apps you want to block" (`src/content/home.ts:26`) |
| `src/features/sheets/selection.ts:9-14` | derives the counts |
| `src/features/sheets/selection.ts:19-21` | reconstructs a selection from counts alone |
| `src/state/rulesStore.ts` | persists/validates `lockedApps` |

### 6.6 If tapping any of these must present Apple's native `FamilyActivityPicker` with NO count anywhere

Files that would change:

**Replace the presentation**
1. `src/demo/fakes/ScreenTimeFake.ts:10-16` — replace `ctx.prompt({kind:'picker'})` with the native call (or add a real `ScreenTimeAdapter` alongside `foregroundGym`/`nativeGait` in `src/runtime/createRuntime.ts:12-16`)
2. `src/ports/RuntimeControls.ts:4-5` — drop the `'picker'` variant from `FakePrompt`
3. `src/features/permissions/FakePromptHost.tsx` — remove the picker branch
4. **Delete** `src/features/sheets/FakeAppPicker.tsx`
5. **Delete/replace** `src/features/sheets/selection.ts` (all three exports) — a real `FamilyActivitySelection` is opaque and cannot be reconstructed from counts (`:16-22` becomes meaningless)
6. `src/content/pickers.ts:1-21` — `title`, `search`, `categories`, `apps`, `options` (`:7-18`), `noResults` all become dead; **`counts` (`:19-20`) is deleted**
7. `src/domain/types.ts:36-40` — `LockedApps` loses `appCount`/`categoryCount`, keeping only the opaque handle
8. `src/state/rulesStore.ts` — the `lockedApps` validator/shape
9. `src/state/validation.ts` — whatever validates those two numbers

**Remove the two rendered counts**
10. `src/features/sheets/FakeAppPicker.tsx:27-32` (goes with the file)
11. `src/features/setup/AppsSetup.tsx:27-29` — delete the `<Reveal>`+`<Label>` block; also `:12` (`selection`), `:7` (import), and rework `:34`'s disabled predicate to a boolean "has selection"

**Rework count-derived predicates to a boolean**
12. `src/features/setup/AppsSetup.tsx:34`
13. `src/features/setup/SetupComplete.tsx:28`
14. `src/features/home/statusContent.ts:55-56`
15. `src/features/home/HomeScreen.tsx:42` (`lockedApps` destructure — note it is currently unused apart from being passed to `statusContent` at `:50`)

**Add the missing native surface (does not exist today)**
16. `app.json:9-12` — add the `com.apple.developer.family-controls` entitlement and any required Info.plist strings
17. a new `modules/…` Expo module wrapping `FamilyActivityPicker` / `AuthorizationCenter` / `ManagedSettingsStore`, plus its plugin, alongside `modules/excerlock-gait-vision` and `modules/expo-local-search`
18. `src/runtime/createRuntime.ts:12-16` — compose it on device the way `foregroundGym` is composed
19. `src/runtime/Runtime.ts:17` — the `screenTime` member stays, but a real adapter must also implement `applyLock` **and something must finally call it** (today: nowhere)

**Tests**
20. `src/features/sheets/__tests__/selection.test.ts` — asserts "exports only aggregate counts and an opaque handle"
21. `src/features/sheets/__tests__/picker.test.tsx` — asserts "returns aggregate selection"
22. `src/features/home/__tests__/home-router.test.tsx:11` — "selected apps open the shared picker"
23. `src/demo/__tests__/ports.test.ts:5` — "fake permission and app-picker prompts resolve through local controls"
24. `src/features/setup/__tests__/setup-router.test.tsx:12,40`
25. `src/demo/__tests__/a11y-scenarios.test.tsx`, `src/demo/__tests__/reachability.test.tsx` — broad sweeps that mount these surfaces
26. `src/design-system/__tests__/FakeSystemPrompt.test.tsx` — the fake prompt host

---

## 7. The History button

**Location: the Home screen, bottom section, directly below the Analytics row.**

`src/features/home/HomeScreen.tsx:206-214`
```tsx
<View style={{ backgroundColor: t.surface.card, borderRadius: t.radius.pill,
               borderWidth: t.stroke.hairline, borderColor: t.border.outline }}>
  <SettingsRow title={c.history} icon="clock" iconTint={t.brand.primary} />
</View>
```

- Title source: `src/content/home.ts:35` — `history: 'History'`
- **It has no `onPress` prop.** `SettingsRow` declares `onPress?` optional (`src/design-system/SettingsRow.tsx:24`) and only wraps its content in a `PressableScale` when one is supplied (`:13,34`). With none, the row renders as inert, non-interactive decoration.
- There is no history route anywhere under `app/` (see the full route list in section 8.0), and no `/history` reference in `src/`.
- **What it currently does: nothing.** It is a visual placeholder.

For contrast, the sibling Analytics row immediately above it does navigate — `HomeScreen.tsx:199-204`, `onPress={() => router.navigate('/analytics')}`.

Other placeholder surfaces nearby: `src/features/home/TabPlaceholder.tsx`; `src/content/home.ts:65` `placeholder: 'Your plan is ready to grow here.'`

---

## 8. Onboarding — ordered steps

### 8.0 All routes under `app/`
`_layout.tsx`, `index.tsx`, `dev.tsx`, `builder.tsx`, `gym-picker.tsx`, `paywall.tsx`, `sign-in.tsx`, `onboarding/[step].tsx`, `setup/[step].tsx`, `unlock/gym.tsx`, `unlock/treadmill.tsx`, `(tabs)/{home,conditions,analytics,settings}.tsx`, `settings/{account,bug,feedback,gyms,preferences,subscription,units}.tsx`, `settings/legal/{index,[doc]}.tsx`, `settings/permission/[name].tsx`.
(`app/settings/support.tsx` is deleted in the working tree per git status.)

### 8.1 The flow definition
`src/onboarding/flow.ts:2-21` — `preBranch` (18 steps): `O01 O02 O03 O04 O05 O06 O08 O09 O10 O11 O12 O13 O14 O15 O16 O17 O18 O20`. **`O07` and `O19` do not exist.**
`src/onboarding/flow.ts:22` — `tail`: `S1 S2 S3 S4 T1 T2 T3 T4 P`
`src/onboarding/flow.ts:23-39` — `pathFor(answers)` inserts the activity branch between them.

Route: `app/onboarding/[step].tsx` -> `src/features/onboarding/OnboardingRoute.tsx`; step->component dispatch in `src/features/onboarding/PreBranchScreen.tsx:20-28`.

### 8.2 Ordered table (**flagged** = mentions running / biking / treadmill / place / walking)

| Step | Route | Component | Purpose | Flag |
|---|---|---|---|---|
| O01 | `/onboarding/O01` | `screens/O01.tsx` | "Block apps. Exercise more." / "Less scrolling. More time to move." (`content/onboarding.ts:2`) | |
| O02 | `/onboarding/O02` | `screens/O02.tsx` (`PreBranchScreen.tsx:21`) | intro 2 — "Reduce your screen time and track your progress." (`:3`) | |
| O03 | `/onboarding/O03` | `screens/O03.tsx` (`PreBranchScreen.tsx:22`) | intro 3 — `ControlArtwork` with four activity tiles | **YES** — `content/welcome.ts:7` `['Walking','Running','Cycling','Strength training']`; tiles `design-system/welcomeTokens.ts:24-25` (`person-running`, `person-biking`); icon map `control/ActivityTile.tsx:9-14` |
| O04 | `/onboarding/O04` | `screens/O04.tsx` | "What should we call you?" — name field (`:5`) | |
| O05 | `/onboarding/O05` | `screens/O05.tsx` | referral source (`onboardingChoices.ts:4-14`) | |
| O06 | `/onboarding/O06` | `screens/O06.tsx` | age band (`:15-18`) | |
| O08 | `/onboarding/O08` | `screens/O08.tsx` | "What is your goal?" — More exercise / Less screen time / Overall wellness | partial — "More exercise" uses the `walking` icon (`onboardingChoices.ts:22`) |
| O09 | `/onboarding/O09` | `screens/O09.tsx` | main reason (6 options) | partial — one option uses the `gym` icon (`:33`) |
| O10 | `/onboarding/O10` | `screens/O10.tsx` | hours scrolling per day (60-720, step 30 — `validation.ts:14-17`) | |
| O11 | `/onboarding/O11` | `screens/O11.tsx` | "Here's some quick math" (`:14`) | |
| O12 | `/onboarding/O12` | `scenes/DotGridReveal.tsx` (`PreBranchScreen.tsx:23`) | "This is a year in your life" (`:15`) | |
| O13 | `/onboarding/O13` | `scenes/DotGridReveal.tsx` | "This is the free time left" (`:16`) | |
| O14 | `/onboarding/O14` | `scenes/DotGridReveal.tsx` | "This is how much time you spend scrolling" (`:17-20`) | |
| O15 | `/onboarding/O15` | `screens/O15.tsx` | "This is good." (`:21`) | |
| O16 | `/onboarding/O16` | `scenes/LoopStory.tsx` (`PreBranchScreen.tsx:24`) | "You're stuck in a loop" (`:22`) | |
| O17 | `/onboarding/O17` | `scenes/LoopStory.tsx` | "We'll change the loop" (`:23`) | |
| O18 | `/onboarding/O18` | `scenes/LoopStory.tsx` | "You become ADDICTED to exercise" (`:24`, emphasis `:27`) | |
| **O20** | `/onboarding/O20` | `screens/O20.tsx` | **"What exercise should unlock your apps?"** -> `ChoiceGrid` of all four | **YES** — `content/activities.ts:1-7`; validation `onboarding/validation.ts:13` |
| **W1** | `/onboarding/W1` | `OnboardingRuleScreen` -> `WalkingScreen` | **"Where will you walk?"** -> Outside / **Treadmill** / Either | **YES** — `content/rules.ts:2,5-9` |
| **W2** | `/onboarding/W2` | `WalkingScreen` | **"How should walking unlock your apps?"** -> step goal vs "Unlock while walking" | **YES** — `content/rules.ts:3,10-13` |
| **W3** | `/onboarding/W3` | `WalkingScreen` | "Set your walking goal" (500-30 000, step 500) | **YES** — `content/rules.ts:4,14-19`; skipped when `walkingMode==='state'` (`flow.ts:36`) |
| G1 | `/onboarding/G1` | `WorkoutModeScreen` | "What counts at the gym?" -> Spend time / Arrive (`workoutRules.ts:2,10-13`) | |
| G2 | `/onboarding/G2` | `WorkoutGoalScreen` | "How long at the gym unlocks your phone?" presets 30/45/60 (`:3,23`) | |
| **R1** | `/onboarding/R1` | `WorkoutModeScreen` | **"What counts as a run?"** (`workoutRules.ts:4,14-17`) | **YES** |
| **R2** | `/onboarding/R2` | `WorkoutGoalScreen` | **"Set your running goal"** presets 15/20/30 (`:5,23`) | **YES** |
| **B1** | `/onboarding/B1` | `WorkoutModeScreen` | **"What counts as a bike ride?"** (`:6,18-21`) | **YES** |
| **B2** | `/onboarding/B2` | `WorkoutGoalScreen` | **"Set your biking goal"** presets 20/30/45 (`:7,23`) | **YES** |
| **D** | `/onboarding/D` | `WorkoutGoalScreen` | **"Choose your distance"** — shared by running and biking (`:8`) | **YES** |
| S1 | `/onboarding/S1` | `rules/ScheduleScreen` (`OnboardingRoute.tsx:43-58`) | "When should blocking be active?" (`content/plan.ts:2-3`) + live `ConditionPreview` | indirect — preview renders place/activity text |
| S2 | `/onboarding/S2` | `rules/PlanBuild` (`OnboardingRoute.tsx:59`) | "Setting up your plan…" (`plan.ts:9`) | |
| S3 | `/onboarding/S3` | `rules/PlanSummary` (`:60`) | "Your plan is ready" — **commits the rule** via `commitPlan` (`OnboardingRoute.tsx:35`) | **YES** — `PlanSummary.tsx:24-25` renders the "Walking place" row |
| S4 | `/onboarding/S4` | `rules/ReviewWarmup` (`:61`) | rating warm-up (`plan.ts:23-27`) | |
| T1-T4 | `/onboarding/T1..T4` | `subscription/TrialScreen` (`:41-42`) | trial explainer | |
| P | `/paywall` | `app/paywall.tsx` | paywall | |

`OnboardingRuleScreen` dispatch: `PreBranchScreen.tsx:25-26` matches `['W1','W2','W3','G1','G2','R1','R2','B1','B2','D']`.
Note the builder path differs: `src/features/conditions/builderFlow.ts:9` inserts a `GPlace` gym-picker step after `G1`, which onboarding does not have (onboarding picks the gym at setup X3 instead).

### 8.3 Setup (post-paywall) — `src/onboarding/setupFlow.ts:2`

| Step | Screen | File:line | Purpose | Flag |
|---|---|---|---|---|
| X1 | `PermissionPrimer name="screenTime"` | `SetupRoute.tsx:42` | "Let ExcerLock block your apps" (`content/setup.ts:2-9`) | |
| X2 | `AppsSetup` | `SetupRoute.tsx:43` | "Which apps should wait?" -> app picker + count | |
| X3 | `GymPickerScreen` **if gym** | `SetupRoute.tsx:44` | full-screen map gym picker | |
| X3 | `PermissionPrimer name={branchPermission(activity)}` otherwise | `SetupRoute.tsx:45` | walking->Motion, running/biking->Health (`setupFlow.ts:14-16`) | **YES** — Health copy at `content/setup.ts:22-25` names running and biking |
| X4 | `SignInScreen` | `SetupRoute.tsx:46` | "Save your progress" | |
| X5 | `SetupComplete` | `SetupRoute.tsx:47` | checklist, then Home (`SetupRoute.tsx:34`) | |

**Camera is never primed in setup** — `PermissionPrimer.tsx:10-27` has entries only for screenTime, motion, health, location.

---

## 9. Settings — every screen and every row

### 9.1 Root — `src/features/settings/SettingsScreen.tsx` (route `app/(tabs)/settings.tsx`)

| # | Row | File:line | Destination | Status |
|---|---|---|---|---|
| 0 | Title "Settings" | `:22-24` | — | FUNCTIONAL |
| 1 | Profile — name or "Account", subtitle "Account & privacy", icon `person` | `:26-31` | `/settings/account` | FUNCTIONAL |
| 2 | **Manage subscription** — subtitle `settingsCopy.plan(status)`, icon `lock` | `:40-45` | `/settings/subscription` | **PARTIAL** — see 9.3 |
| 3 | Notifications — switch | `:40-47` (rows `:40-47`), toggle handler `:44-47` | writes `permissionsStore.notifications` directly | **PLACEHOLDER** — no OS prompt, no `NotificationsPort` call; flips a local store value |
| 4 | Report a bug — "Tell us what went wrong", icon `info` | `:48-53` | `/settings/bug` | FUNCTIONAL |
| 5 | Give feedback — "Help us make ExcerLock better", icon `star` | `:54-59` | `/settings/feedback` | FUNCTIONAL |
| 6 | Support — "Email us", icon `mail` | `:60-67` | `openSupportEmail()` (`src/runtime/SupportDelivery.ts`) | FUNCTIONAL on device; error note `:70-74` |
| 7 | Legal — "Terms and privacy", icon `list` | `:68` | `/settings/legal` | PARTIAL — navigation works, documents are placeholders |
| 8 | Version footer, 7 taps -> `/dev` | `:75-86`, counter `:78-81` | `/dev` | FUNCTIONAL |

Strings: `src/content/settings.ts:1-18,37`. Documented contract: `src/features/settings/README.md:7-15`.

**Rows the root screen does NOT have (though their routes exist):** Preferences, Units, Saved gyms, Permissions.

### 9.2 `/settings/account` — `AccountScreen.tsx` — FUNCTIONAL
| Row | Line |
|---|---|
| Heading + session state ("Not signed in" / "Signed in with X") | `:48` |
| Sign in (anonymous) | `:57` -> `/sign-in` |
| Sign out | `:60` -> `runtime.auth.signOut()` |
| Delete account | `:61` -> confirm sheet `:33-46`, facts `src/content/settings.ts:100-106`, `runtime.auth.deleteAccount()` `:19` |

### 9.3 `/settings/subscription` — `SubscriptionScreen.tsx` — PARTIAL

| Row | Line | Behaviour |
|---|---|---|
| Heading "Subscription" + billing support line | `:38` | |
| Plan status + renewal date (inert, no `onPress`) | `:40-43` | display only |
| **"Manage subscription"** | `:44` -> `manage()` `:28-35` | **On a physical device: `Linking.openURL(appStoreSubscriptionsUrl)`** — opens Apple's system subscription management page (`src/content/subscription.ts`). **On simulator or on failure: sets `subscriptionCopy.manageFallback` as an inline note.** It does NOT open an in-app management UI, does not cancel, upgrade, or change anything in-app. |
| Restore purchases | `:45-49` -> `restore()` `:16-27` | calls `runtime.subscription.restore()` — the `SubscriptionFake`, whose outcome is set by the dev control `restoreOutcome` (`src/demo/fakes/SubscriptionFake.ts`, `DevControls.tsx:93-100`). Result note "Purchases restored" / "No active purchase found" (`content/settings.ts:39-40`) |

Status PARTIAL because the deep link is real but every entitlement value behind it is fake (`entitlementStore` seeded by scenario).

### 9.4 `/settings/bug` and `/settings/feedback` — FUNCTIONAL
`BugReportScreen.tsx` / `FeedbackScreen.tsx`, thin wrappers over `SupportFormScreen.tsx`. Bug -> category `Problem` + device info; Feedback -> category `Idea`. Port `src/ports/SupportPort.ts:3-5`; fake `src/demo/fakes/SupportFake.ts`; device delivery `src/runtime/SupportDelivery.ts`. Documented `README.md:21`.

### 9.5 `/settings/legal` — PARTIAL (navigation) / PLACEHOLDER (content)
- `LegalHubScreen.tsx` — "Privacy & terms" (`content/settings.ts:20`), links Privacy Policy `:60` and Terms of Use `:61`
- `/settings/legal/[doc]` -> `LegalScreen.tsx`
- Content: `src/content/legal.ts` — explicitly labelled `settingsCopy.legalPlaceholder` = "These are Phase 1 placeholder documents." (`content/settings.ts:21`); confirmed `src/features/settings/README.md:23`

### 9.6 `/settings/gyms` — `GymsScreen.tsx` — FUNCTIONAL, but **unreachable from Settings**
| Row | Line |
|---|---|
| Heading "Saved gyms" | `:51` |
| Per-gym row: name, `address · {radius} m`, tap to edit | `:57-65` |
| Per-gym "Remove gym: {name}" | `:66` -> confirm `:37-48` |
| "You can save up to 5 gyms." | `:73` |
| "Add gym" (disabled at 5) | `:74` |
| Empty state | `:71` |

Only entry points: `src/features/home/HomeScreen.tsx:157` (walk sheet's `onChooseGym`) and `src/features/unlock/GymUnlockScreen.tsx:61` (no-gym fallback). **Nothing in Settings links to it.**

### 9.7 `/settings/preferences` — `PreferencesScreen.tsx` — **ORPHANED ROUTE**

Grep across `src/` and `app/` finds **no** `navigate('preferences')` / `push('/settings/preferences')`. Only `app/settings/preferences.tsx:5` defines it. Contents (all functional if you could reach them):

| Row | Line | Status |
|---|---|---|
| Heading "Privacy & permissions" | `:43` | |
| 6 `PermissionRow`s (Screen Time, Motion & Fitness, Location, Health, Camera, Notifications) | `:44-62`, names `content/settings.ts:64-71`, icons `PermissionDetail.tsx:9-15` | FUNCTIONAL -> `/settings/permission/{name}` |
| "Walk & Scroll stop grace" + sheet | `:64-68` + `:29-41` | FUNCTIONAL — writes `settings.stopGrace` |
| "Gym auto-detect" toggle | `:69-77` | **PLACEHOLDER in effect** — sets `location:'always'` + a flag nothing consumes for background work (section 5.9) |
| "Touch feedback" (haptics) toggle | `:78-82` | FUNCTIONAL |
| "Saved gyms" | `:85` | FUNCTIONAL -> `/settings/gyms` |
| "Locked apps" | `:86` | FUNCTIONAL -> fake app picker |

### 9.8 `/settings/permission/[name]` — `PermissionDetail.tsx` — **ORPHANED** (only reachable from the orphaned Preferences)
Shows per-permission "why" (`content/settings.ts:72-79`), "without" (`:80-87`), and status labels (`:88-95`). Note `settingsCopy.settingsNote` (`:63`): *"This preview leaves device settings unchanged. The connected app will open iOS Settings here."* — i.e. the Open Settings action is itself a stub.

### 9.9 `/settings/units` — `UnitsScreen.tsx` — **ORPHANED ROUTE**
No navigation entry anywhere. Logic `src/features/settings/preferences.ts:4-13` (`setUnits`) relabels distance rules and throws `unitsError` (`content/settings.ts:46`) if a goal falls out of range. Tested by `src/features/settings/__tests__/preferences.test.ts`.

### 9.10 Summary of orphaned settings surface
`preferences`, `units`, `permission/[name]` have zero navigation entry points; `gyms` is reachable only from Home/unlock, not Settings. That means **all six permission rows, stop-grace, gym auto-detect, haptics and units are currently unreachable through the UI.**

---

## 10. Tests

### 10.1 Would FAIL if `running` and `biking` are removed from `Activity`

**Direct enumeration of the four activities / run+bike branches (hard failures):**
| File:line | Assertion |
|---|---|
| `src/features/rules/__tests__/activity-branches.test.tsx:19` | `test.each(paths)` over every activity branch incl. R/B/D |
| `src/features/rules/__tests__/activity-branches.test.tsx:51` | "activity defaults stay separate and distance unit changes do not convert the number" |
| `src/features/rules/__tests__/activity-branches.test.tsx:59` | "canceling an invalid distance edit restores the valid summary" |
| `src/features/rules/__tests__/draft.test.ts:15` | `test.each(['gym','running','biking'])` |
| `src/features/rules/__tests__/draft.test.ts:18` | "all alternative modes serialize and unit changes retain the number" |
| `src/features/rules/__tests__/condition-sentence.test.ts:19` | "each activity phrases its own condition" |
| `src/features/rules/__tests__/plan.test.ts:8` | `test.each` over branch paths |
| `src/features/rules/__tests__/rule-preview.test.ts:4` | `test.each` over preview strings |
| `src/features/rules/__tests__/workout-goals.test.tsx` | the R/B/G goal screens |
| `src/features/rules/__tests__/schedule-screen.test.tsx` | references running |
| `src/features/conditions/__tests__/builder.test.tsx:37` | `test.each` over activities |
| `src/domain/__tests__/validateRule.test.ts:3` | "every activity keeps its prescribed bounds" |
| `src/domain/__tests__/labels.test.ts:4` | "condition names and schedules use the product vocabulary" (uses `verbs`) |
| `src/domain/__tests__/unlockHint.test.ts:6` | numeric remainders across units |
| `src/onboarding/__tests__/flow.test.ts:6` | `test.each` over `pathFor` branches |
| `src/features/setup/__tests__/setupFlow.test.ts:8` | `test.each` over `branchPermission` |
| `src/design-system/__tests__/ChoiceGrid.test.tsx:3` | **"the activity grid offers four individually selectable activities"** |
| `src/icons/__tests__/icons.test.tsx:4,30,37` | every semantic icon renders / resolves to canonical geometry |

**Analytics:**
| File:line | Assertion |
|---|---|
| `src/features/analytics/__tests__/model.test.ts:20,27,35,43,61,66` | period math over per-activity series |
| `src/features/analytics/__tests__/screen.test.tsx:5` | `test.each` over tiles |

**Fixtures / scenario sweeps (fail because `runner-distance` and `biker-time` become invalid):**
| File:line |
|---|
| `src/demo/__tests__/scenarios.test.ts:3` — "all required scenarios are valid…" |
| `src/demo/__tests__/reachability.test.tsx:8` — `test.each(scenarios)` |
| `src/demo/__tests__/a11y-scenarios.test.tsx:13` — `test.each(scenarios)` |
| `src/demo/__tests__/acceptance-integrity.test.ts:7,41` — steps + workout minutes; `:41` "fake usage, steps and workouts do not leak into a different calendar day" |
| `src/demo/__tests__/analytics-six-weeks.test.ts:3` |
| `src/features/home/__tests__/live-progress.test.ts:52` — "yesterday's Health workouts never fulfill the next day's condition" |
| `src/features/settings/__tests__/preferences.test.ts` — unit conversion on distance rules |
| `src/features/settings/__tests__/screen.test.tsx` — references running |
| `src/state/__tests__/stores.test.ts:8` — "all eight stores reject malformed persisted fields" |
| `src/state/__tests__/persist.test.ts:3` |

**Snapshot to regenerate:** `src/demo/__tests__/__snapshots__/home-progress-content.test.ts.snap` (contains walking/gym/running/biking rows), driven by `src/demo/__tests__/home-progress-content.test.ts:3`.

**Count: 18 test files + 1 snapshot.**

### 10.2 Tests asserting the walking-detection copy / state machine

| File:line | Assertion |
|---|---|
| `src/features/home/__tests__/walking-sync.test.ts:21` | "walking is detected on its own, unlocks after a sustained cadence, pauses in grace and relocks when it stops" — uses `WALK_VERIFY_MS` (`:31,88`) and `stopGrace` (`:43,47`) |
| `src/features/home/__tests__/walking-sync.test.ts:54` | "a brief shuffle never verifies, and a walk the user stopped is not restarted until walking begins again" |
| `src/features/home/__tests__/walking-sync.test.ts:81` | "the manual route verifies from the same signal and denied Motion blocks automatic starts" |
| `src/demo/__tests__/home-progress-content.test.ts:3` | `test.each` -> the phase-to-copy snapshot (contains "Detecting walking…", "Walking detected", "Keep walking to stay unlocked", "Keep walking. Checking your pace…") |
| `src/demo/__tests__/home-status.test.ts:23,32,39` | status-model strings incl. the walking lease clock |
| `src/features/sessions/__tests__/sheets.test.tsx` | the Walk & Scroll sheet's phase headings and the treadmill framing block |
| `src/demo/__tests__/session-integrity.test.ts:5` | "verified state-walking minutes count toward streak without latching an unlock" |
| `src/demo/__tests__/session-integrity.test.ts:16` | "ten state-walking minutes make a scheduled day met" |
| `src/demo/__tests__/session-integrity.test.ts:32` | "loading a live walking fixture resumes its script and eventually relocks" |
| `src/demo/__tests__/context-persistence.test.ts:11` | "cold runtime resumes a saved walking lease without losing verified minutes" |
| `src/demo/__tests__/ports.test.ts:21` | "scripted walking phases and gym arrivals update observable local facts" |
| `src/domain/__tests__/resolveLock.test.ts:24` | "a live walking lease wins over a met target; grace remains live; expired and paused do not" |
| `src/domain/__tests__/progress.test.ts:4` | "progress latches met and its original instant; **state rules never become met**" |
| `src/features/home/__tests__/blockingSchedule.test.ts:30` | "walking state does not claim a permanent unlock" |
| `src/design-system/__tests__/LockCard.test.tsx:4` | "lock body contains live progress and keeps condition actions usable" |
| `src/design-system/__tests__/ProgressBar.test.tsx:3` | `test.each([0,0.5,1])` — "progress %s exposes the right percentage" |

### 10.3 Treadmill / gait tests
| File:line |
|---|
| `src/features/unlock/__tests__/treadmill.test.tsx:7` — "treadmill preview detects the recorded gait without starting a real walking session" |
| `src/features/unlock/__tests__/treadmill.test.tsx:24` — "camera denial offers handheld walking instead of granting scan credit" |
| `src/features/unlock/__tests__/UnlockLockFrame.test.tsx:9` |
| `src/features/unlock/__tests__/geometry.test.ts:3,9,14` |
| `src/features/rules/__tests__/walking.test.tsx:5` — "place and walking mode choices report draft actions" |
| `src/features/rules/__tests__/walking-router.test.tsx:15` |

### 10.4 Gym tests
| File:line |
|---|
| `src/features/home/__tests__/gym-presence.test.ts:30` — auto-confirm / unlock / minutes / pause / relock |
| `src/features/home/__tests__/gym-presence.test.ts:60` — "a walk past the gym never confirms; a real arrival marks an arrival condition met" |
| `src/features/home/__tests__/gym-presence.test.ts:82` — "without location access nothing confirms automatically" |
| `src/features/home/__tests__/gym-presence.test.ts:93` — "a stale confirmed visit does not survive a scenario reload" |
| `src/features/unlock/__tests__/gym.test.tsx:22` — "gym confirmation takes 30 seconds and loss of presence resets it" |
| `src/features/unlock/__tests__/gym.test.tsx:33,47,58` |
| `src/features/sheets/__tests__/gym.test.ts:3,15` |
| `src/features/gym-picker/__tests__/picker.test.tsx` (6 tests), `geometry.test.ts:3` |
| `src/domain/__tests__/resolveLock.test.ts:114` — "a confirmed gym presence unlocks only while a gym condition is active" |
| `src/demo/__tests__/session-integrity.test.ts:24,41` |
| `src/demo/__tests__/acceptance-integrity.test.ts:55` — `test.each(['gym-arrival-user','gym-time-user'])` |

---

## 11. Top findings

1. **Nothing blocks anything.** `ScreenTimePort.applyLock` (`src/ports/ScreenTimePort.ts:7`) has zero call sites; there is no FamilyControls dependency, module, or entitlement. The whole `LockDecision` model (`src/domain/resolveLock.ts`) drives copy only.
2. **Walking detection is a dev toggle.** `src/demo/fakes/WalkingFake.ts:21` reads `ctx.snapshot().motion`. The 10 s verify / 15 min lease / grace machine is real and well tested, but the input is synthetic. Steps are a linear ramp (`src/demo/stepCount.ts:10-14`); running/biking come from scenario fixtures (`src/demo/fakes/HealthFake.ts:9-12`).
3. **The treadmill gait pipeline is the only genuinely real detection** — Vision pose + face, a periodicity detector with device-verified constants (`GaitPeriodicityDetector.ts:54-59`). It is hard-foreground (`TreadmillUnlockScreen.tsx:71-75`) and needs its screen open.
4. **Gym presence is 3-second foreground polling** (`ForegroundGym.ts:33`), not a geofence. The "Auto-detect arrivals" toggle claims background behaviour the native layer cannot deliver (when-in-use only, `PickerLocationService.swift:25`).
5. **Dead / unreachable UI:** the Home History row has no handler (`HomeScreen.tsx:213`); `/settings/preferences`, `/settings/units` and `/settings/permission/*` have no navigation entry point, taking all six permission rows, stop-grace, auto-detect, haptics and units offline.
6. **Copy is duplicated** between `src/content/home.ts:5-9` and `src/content/sessions.ts:4-11` for every walking phase — change both.
7. **`900000` is hardcoded four times** in `WalkingFake.ts` (`:82,83,109,138`) while `WALK_LEASE_MS` is used twice (`:46,52`).
8. **`place: 'either'` is inconsistent** — `entry.ts:4` routes it to the camera ceremony, `WalkingSheet.tsx:25` does not give it the framing UI.
