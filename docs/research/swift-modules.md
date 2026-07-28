# Custom Swift modules: motion/cadence Expo module + App Intents target

**Ticket:** #21 · **Feeds:** §5 spike 3 (Walk & Scroll runtime), §3.15 Siri rows, the build-phase epic breakdown · **Date:** 2026-07-28

Two native pieces the PRD names that no off-the-shelf wrapper covers: the **CMMotionActivity + CMPedometer cadence module** behind Walk & Scroll (§3.5b — `expo-sensors`' Pedometer has no live cadence and no activity classification, PRD §10.9 already rules it out) and the **App Intents target** behind the three Siri rows (§3.15: "How much time do I have left?" / "Start a Walk & Scroll session" / "Check in at the gym"). This doc sketches both APIs, the SignalKit mock contract, risks, and build order.

Verified against: Expo Modules API docs (docs.expo.dev, fetched 2026-07-28 — Expo MCP is unauthenticated in this session, so docs were read directly per ticket instructions), Apple Core Motion docs + forums, `@bacons/apple-targets` README, and expo/expo PR #47207.

---

## Module 1 — `excerlock-motion` (local Expo Module, Swift)

### What it is and is not

A **dumb sensor pipe**: it forwards raw Core Motion streams to JS and nothing else. The walk verdict — *classified walking AND cadence ≥ threshold, sustained* (§3.5b) — lives in **JS inside SignalKit** (`WalkVerifier`), because the cadence threshold, grace period, and per-day caps are user settings (§6/§8 knobs), the verdict logic must be TDD-able in the simulator loop, and the DeviceActivity increment re-arm it drives is already JS-side (device-activity-gaps.md M12/M13). Keeping the native layer threshold-free means every §8 knob change is a JS change.

It also does **not** own location. The background keep-alive is `expo-location` + `expo-task-manager` continuous updates, started from the foreground per §3.5b — already the PRD §10.9 plan. The motion module works *because* that location session keeps the process executing; it never touches CLLocationManager itself.

### TypeScript-facing API

```ts
// modules/excerlock-motion/index.ts  (public surface — SignalKit is the only intended consumer)

export type MotionAuthStatus = 'notDetermined' | 'restricted' | 'denied' | 'authorized';
export type ActivityClass = 'walking' | 'running' | 'cycling' | 'automotive' | 'stationary' | 'unknown';
export type Confidence = 'low' | 'medium' | 'high';

export type ActivitySample = {
  /** All classes iOS reported true, mapped from CMMotionActivity's booleans (several can be true at once). */
  classes: ActivityClass[];
  confidence: Confidence;
  /** CMMotionActivity.startDate — when iOS believes this activity state began (epoch ms). */
  startedAt: number;
  /** When the handler delivered it (epoch ms) — startedAt→receivedAt is the honest classification lag (§3.5b). */
  receivedAt: number;
};

export type CadenceSample = {
  /** CMPedometerData.currentCadence in steps/sec — null when iOS omits it (live-only field; also nil early in a session). */
  stepsPerSecond: number | null;
  /** CMPedometerData.numberOfSteps since start() — monotonic within a session. */
  cumulativeSteps: number;
  /** End of the window this sample covers (epoch ms). */
  asOf: number;
};

export type MotionAvailability = { activity: boolean; cadence: boolean; stepCounting: boolean };

// --- methods ---
/** Device capability (CMMotionActivityManager.isActivityAvailable / CMPedometer.isCadenceAvailable / .isStepCountingAvailable). All false on simulator. */
export function getAvailability(): MotionAvailability;
export function getAuthorizationStatus(): MotionAuthStatus;
/** Triggers the Motion & Fitness prompt (via a throwaway historical query — Core Motion has no standalone request API) and resolves with the resulting status. */
export function requestAuthorization(): Promise<MotionAuthStatus>;
/** Starts both streams (activity updates + live pedometer). Idempotent per session; rejects if unavailable/denied. */
export function start(): Promise<void>;
export function stop(): Promise<void>;
/** Gap repair after process suspension: CMMotionActivityManager.queryActivityStarting / CMPedometer.queryPedometerData. currentCadence is always null here (historical). */
export function queryActivity(fromMs: number, toMs: number): Promise<ActivitySample[]>;
export function querySteps(fromMs: number, toMs: number): Promise<{ steps: number }>;

// --- events (Expo EventEmitter) ---
// 'onActivityChange' → ActivitySample    (fires when iOS reports a state change — not periodic)
// 'onCadence'        → CadenceSample     (fires ~every 1–2.5 s while moving; sparse when still)
```

**Error contract** (Expo `Exception` subclasses, surfaced as coded JS errors): `ERR_MOTION_UNAVAILABLE` (sim / old hardware), `ERR_MOTION_DENIED`, `ERR_MOTION_RESTRICTED` (MDM/parental), `ERR_MOTION_NOT_STARTED` (stop/query race). `start()` while denied rejects rather than silently streaming nothing — SignalKit routes that to the §3.15 Permissions health panel.

### Swift-side responsibilities

- One `CMMotionActivityManager` + one `CMPedometer`, handlers on a private `OperationQueue`, events forwarded with `sendEvent` (Expo Modules `Events("onActivityChange", "onCadence")` definition).
- `OnStartObserving`/`OnStopObserving` only gate whether events are *forwarded*; the managers start/stop strictly on `start()`/`stop()` so a JS re-render can't kill a live session.
- `start()` calls `startActivityUpdates(to:)` + `startUpdates(from: Date())`. Sensors keep delivering while the app is background-executing (the §3.5b location session guarantees that); if iOS ever suspends and resumes the process, SignalKit calls `queryActivity`/`querySteps` to repair the gap before re-verifying.
- Map `CMMotionActivity` booleans → `classes[]` (walking+automotive simultaneously true is real; SignalKit's verifier treats `automotive` as disqualifying regardless of `walking`), `CMMotionActivityConfidence` → string enum.
- No state persisted natively. No App Group needed.

### Config-plugin needs

Almost none — this is the cheap one:

| Need | Mechanism |
| --- | --- |
| `NSMotionUsageDescription` | plain `app.json` → `ios.infoPlist` (honest copy: "verifies you're walking during Walk & Scroll sessions") — no custom plugin code |
| Background keep-alive (`UIBackgroundModes: location`) | belongs to `expo-location`'s config, not this module |
| Module packaging | local module: `npx create-expo-module@latest --local` → `modules/excerlock-motion/` with `expo-module.config.json` (`platforms: ["apple"]`), autolinked; iOS-only — `index.ts` exports the mock resolver (below) so Android/sim never touch native |

---

## Module 2 — App Intents target (`targets/app-intents/`)

### Packaging decision: App Intents **extension** via `@bacons/apple-targets`, not main-target Swift

Three routes exist in 2026:

1. **`expo-app-intents` (official)** — expo/expo PR #47207 is a **draft** as of 2026-07-27 (perform handlers still native-only, review changes pending, no SDK release named). Watch it; do not build on it.
2. **Swift compiled into the main app target** via a custom `withXcodeProject` config plugin. Works on iOS 16, but running any intent background-launches the **whole app process — a full RN boot to answer "how much time do I have left?"**. Slow (seconds) and battery-hostile.
3. **App Intents extension target** via `@bacons/apple-targets` — `app-intent` is a first-class supported target type (`targets/app-intents/expo-target.config.js`, own entitlements incl. App Groups, Swift files auto-linked, survives `prebuild --clean`). Since **iOS 17**, `AppShortcutsProvider` and its intents may live in the extension itself, so background intents run in a tiny extension process with **no app launch at all**. On iOS 16 the provider had to sit in the main target — but the map's G3 finding already forces the **min-iOS 17.4 decision**, which this lands on the same side of: **set min iOS 17.4 and use the extension.** (Kingstinct maintains a fork, `@kingstinct/expo-apple-targets` — same maintainer as react-native-device-activity; evaluate which fork is healthier at build time.)

The extension talks to the app exclusively through the **shared App Group** — the exact same architecture react-native-device-activity already imposes (device-activity-gaps.md: "everything crosses process boundaries via app-group UserDefaults"), and the library already exposes `userDefaultsSet/Get` to JS, so **the app side needs zero new native code to feed the intents**.

### The three intents

| Intent | Execution | How it works |
| --- | --- | --- |
| `TimeLeftIntent` — "How much time do I have left in ExcerLock?" | Background, extension process, no app launch | Reads the balance snapshot from the App Group, **corrects for staleness by also reading the drain-tick events** the DeviceActivity monitor extension persists to the same App Group (device-activity-gaps.md M5) — `remaining = snapshot.minutes − ticksSince(snapshot.asOf)`. Returns a spoken/`IntentDialog` result ("About 40 minutes left. Shields go up when it runs out."). Never opens the app. |
| `StartWalkSessionIntent` — "Start a Walk & Scroll session" | `openAppWhenRun = true` | §3.5b is explicit: sessions are foreground-started (the continuous-location session must begin in the foreground). The intent writes `intents.pendingAction = {type: "startWalkSession", requestedAt}` to the App Group, then opens the app; the JS router reads-and-clears the key on foreground and drives straight into the session-start flow. Works identically from cold start and warm resume. |
| `GymCheckInIntent` — "Check in at the gym" | Background first, foreground fallback | Reads the geofence state cache the app maintains in the App Group (fresh by construction: region-entry wakes the app process, which updates the cache). Inside a gym region and past the §3.4 presence-confirmation cooldown → append a check-in request to `intents.queue`, post a Darwin notification (`CFNotificationCenterGetDarwinNotifyCenter`) so a running app processes it instantly (else on next wake), return "Checked in at {gym name} ✓". State stale/outside/ambiguous → `needsToContinueInForegroundError` (ForegroundContinuableIntent) so the app opens on the gym card and verifies with live location. **The extension never runs CLLocationManager itself** — whether an App Intents extension can get a location fix is exactly the kind of undocumented edge we don't bet on. |

`AppShortcutsProvider` lists all three App Shortcuts with static phrases (each must contain `\(.applicationName)`). App Shortcuts need **no donation** — they're available in Siri/Shortcuts/Spotlight from install. No `AppEntity` parameters in v1 (gym-name entities via `setEntityCatalog`-style plumbing is a v1.x nicety); static phrases keep the target trivial.

### App Group layout (contract between app JS, DeviceActivity extensions, and the intents extension)

One group — the same `group.…` id react-native-device-activity's config plugin already requires. Namespaced keys, all values JSON strings, all writes via the RNDA `userDefaultsSet` bridge from JS:

| Key | Writer → Reader | Content |
| --- | --- | --- |
| `intents.balance.snapshot` | app JS (on every balance mutation) → TimeLeftIntent | `{remainingMinutes, shieldsActive, asOf}` |
| `rnda:events…` (library's own tick keys) | DeviceActivity monitor ext → TimeLeftIntent | drain ticks for staleness correction (read-only; exact key shape pinned when the drain ladder is built — G4 spike) |
| `intents.gym.state` | app JS (on geofence enter/exit wake) → GymCheckInIntent | `{insideGymId, gymName, lastConfirmedAt, cooldownUntil}` |
| `intents.pendingAction` | intents ext → app JS (read-and-clear on foreground) | `{type, requestedAt}` |
| `intents.queue` | intents ext (append) → app JS (drain) | check-in requests `[{gymId, at}]` |
| `intents.config` | app JS → intents ext | display strings + cooldown knobs so intent copy never hardcodes economy rules |

Rule: **JS owns every decision; extensions only read state and enqueue facts.** Same philosophy that made the RNDA action system workable (extensions execute pre-declared behavior, never compute).

### Config for the target

```js
// targets/app-intents/expo-target.config.js
module.exports = {
  type: 'app-intent',
  name: 'ExcerLockIntents',
  deploymentTarget: '17.4',
  entitlements: { 'com.apple.security.application-groups': ['group.<same-as-rnda>'] },
  frameworks: ['AppIntents'],
};
```

Swift files: `TimeLeftIntent.swift`, `StartWalkSessionIntent.swift`, `GymCheckInIntent.swift`, `ShortcutsProvider.swift`, `AppGroupStore.swift` (tiny typed reader/writer shared with nothing — the app side goes through RNDA's bridge). Distribution note: this is a **fourth extension target** → the FamilyControls-entitlement count from device-activity-gaps.md is unaffected (no FamilyControls here), but provisioning profiles/bundle ids exist per target — EAS credentials must cover app + 3 RNDA targets + this one.

---

## The SignalKit mock contract (simulator reality: Core Motion is dead on sim)

`CMMotionActivityManager.isActivityAvailable` and `CMPedometer.isStepCountingAvailable/isCadenceAvailable` are all **false on simulator** — there is no seeding harness equivalent to HealthKit's (healthkit-coverage.md). So the mock line sits **above the module**, mirroring the `HealthProvider` pattern already locked there:

```ts
// SignalKit's MotionProvider interface — the only thing the condition engine and screens ever see
interface MotionProvider {
  getAvailability(): MotionAvailability;
  getAuthorizationStatus(): MotionAuthStatus;
  requestAuthorization(): Promise<MotionAuthStatus>;
  start(): Promise<void>;
  stop(): Promise<void>;
  queryActivity(fromMs: number, toMs: number): Promise<ActivitySample[]>;
  querySteps(fromMs: number, toMs: number): Promise<{ steps: number }>;
  on(event: 'activity', cb: (s: ActivitySample) => void): Unsubscribe;
  on(event: 'cadence', cb: (s: CadenceSample) => void): Unsubscribe;
}
```

- **`NativeMotionProvider`** wraps `excerlock-motion` 1:1. **`FixtureMotionProvider`** replays scripted timelines; selection is by `getAvailability()` + build flag, so the sim loop (Maestro) always runs fixtures with zero conditional code in screens.
- **Fixture timeline format** — a walk session is a list of `{atMs, event: 'activity'|'cadence', payload}` rows played on a virtual clock (fake timers in unit tests, accelerated real time in Maestro). Canonical fixtures to ship with the first test file: `steady-walk` (walking/high + 1.7 steps/s), `red-light` (30 s stationary dip inside grace), `stop-for-good` (stationary + cadence→null past grace), `drive-off` (automotive+walking both true — must disqualify), `shaky-cheat` (cadence spikes, activity stationary — must disqualify), `late-classification` (cadence live 20 s before walking flips true — §3.5b honest-lag case), `denied-permission`.
- **What fixtures cannot prove** (device smoke suite items, folds into §5 spike 3): real classification lag distribution, cadence-handler cadence while backgrounded under the location session, permission-prompt UX, force-quit → one-increment cap.
- The three intents are native-only surface — nothing to mock in JS. Sim testing of their *app-side halves* = write `intents.pendingAction`/`intents.queue` keys directly in test setup (RNDA `userDefaultsSet`) and assert the router/queue-drain behavior.

## Risks

1. **CMPedometer live updates while backgrounded** — old reports of handlers pausing in background are watchOS-flavored (Apple forums thread 30339); on iOS with the process background-executing under the location session they should keep firing, but this is exactly the load-bearing assumption of §3.5b. **Spike 3 must measure it.** Fallback is clean and stays inside the module contract: SignalKit polls `querySteps` on a 5 s timer (works whenever the process is alive) and derives cadence as Δsteps/Δt — `stepsPerSecond` from live updates becomes an optimization, not a dependency.
2. **Classification lag & flapping** — `startedAt→receivedAt` lag of seconds-to-~30 s is PRD-accepted; the grace period absorbs it. The verifier must debounce on `startedAt`, not arrival time, or a late "stationary" report retroactively kills a session the user already resumed.
3. **App Shortcuts in the extension = iOS 17 floor** — packaged recommendation assumes the G3-driven min-iOS 17.4 decision lands as expected. If it somehow lands < 17, the fallback is route 2 (main-target compile, slow Siri answers) — flag in the min-iOS grill.
4. **`@bacons/apple-targets` maturity** — self-described "possibly full of bugs"; xcode-project mutation breaks with Xcode majors. Mitigations: it only runs at prebuild (CI failure, not runtime), Kingstinct fork exists, and the escape hatch (hand-rolled `withXcodeProject` plugin) reuses the identical Swift files.
5. **`expo-app-intents` will ship eventually** — the draft PR's dispatch model (intents → invocation store → JS events) is close to our App-Group queue; keep `AppGroupStore.swift` thin so migration is mostly deletion.
6. **Time-left staleness** — correctness depends on reading RNDA's tick keys, whose exact shape is G4-spike output; until pinned, the intent ships snapshot-only with rounded copy ("about N minutes") — §3.5-style honesty, never a precise wrong number.
7. **Prebuild hygiene** — local module + `targets/` + RNDA's three generated targets all regenerate on `prebuild --clean`; CI must assert all five targets + entitlements survive a clean prebuild (same class of guard as healthkit-coverage.md's patch-package assert).

## Build order (recommendation)

1. **`MotionProvider` contract + `FixtureMotionProvider` + `WalkVerifier`, TDD, now** — pure JS, zero native, unblocks the entire Walk & Scroll condition card + session UI in the simulator loop before any Swift exists.
2. **`excerlock-motion` module** — small, dependency-free; needed on-device for §5 spike 3, which also retires Risk 1 and (with device-activity-gaps.md G2) fixes the real increment length.
3. **Walk watchdog integration** — verifier drives RNDA renewable increments (M12/M13); the piece spike 3 exists to validate.
4. **App Intents target last** — fully independent of the walk stack, but its two hard inputs (balance-snapshot schema, tick-key shape) only stabilize once the balance engine and drain ladder exist. Static-phrase v1; entities later.

## Sources

- Expo Modules API & local modules: docs.expo.dev `/modules/module-api/` (Events, `sendEvent`, `OnStartObserving`/`OnStopObserving`, AsyncFunction, Records/Enumerable, Exceptions), `/modules/get-started/` (`create-expo-module --local`, `modules/` autolinking) — fetched 2026-07-28.
- Apple: `CMMotionActivityManager` / `CMMotionActivity` docs (activity booleans, confidence, `queryActivityStarting`, sim-unavailable); `CMPedometerData.currentCadence` (steps/sec, live-updates-only, nil on historical); Apple forums thread 30339 (background pedometer behavior, watchOS context).
- `@bacons/apple-targets` README (EvanBacon/expo-apple-targets, fetched 2026-07-28): `app-intent` target type, `expo-target.config.js`, entitlements/App Groups, `_shared` linking, prebuild persistence, stability caveats; `@kingstinct/expo-apple-targets` fork (npm).
- App Intents packaging: Apple forums threads 734477 & 759160 + community guides — AppShortcutsProvider main-target rule on iOS 16, iOS 17 App-Shortcuts-in-extension support avoiding background app launch; `openAppWhenRun`; ForegroundContinuableIntent.
- expo/expo PR #47207 (`expo-app-intents`, behenate) — draft as of 2026-07-27; native-compiled intents, JS invocation events, min iOS 16.4.
- Repo: `excerlock-app-prd.md` §3.4, §3.5b, §3.15, §10.9; `docs/research/device-activity-gaps.md` (M5/M12/M13, G2–G4, App-Group architecture); `docs/research/healthkit-coverage.md` (SignalKit provider pattern, sim strategy).
