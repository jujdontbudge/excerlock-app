# excerlock-motion

`excerlock-motion` is ExcerLock's local iOS Expo Module for the two live Core Motion signals required
by Walk & Scroll. It streams `CMMotionActivityManager` classification and
`CMPedometer.currentCadence`, and exposes historical activity and step queries. The module is a dumb
sensor pipe: qualification remains in SignalKit's `WalkVerifier`.

## Contract

The TypeScript surface exposes availability and authorization status, authorization requests,
idempotent `start`/`stop`, historical `queryActivity`/`querySteps`, and the `onActivityChange` and
`onCadence` events. `NativeMotionProvider` adapts those names to the unchanged `MotionProvider`
contract. Expo autolinking discovers the pod through `expo-module.config.json`; the config plugin
adds `NSMotionUsageDescription`, so `expo prebuild --clean` regenerates all required native wiring.

The production signal feed constructs `WalkVerifier` only when the user has selected a stop-grace
period, sends both native event streams through it, and publishes cadence-freshness and grace-period
deadlines with an on-device watchdog. A walking classification by itself never becomes an active
walking signal.

The module does not decide whether a person is walking. `WalkVerifier` requires both a walking
classification and sustained cadence at or above
`WALK_CADENCE_THRESHOLD_STEPS_PER_MINUTE`. That app-fixed constant lives only in
`app/src/signals/motion/constants.ts`; its current 65 steps/minute value is the midpoint of the PRD's
60–70 starting band. It is provisional until physical-device spike #27 tunes it and is never a user
setting. Renewable 15-minute access increments and full-price walking are product/session rules,
not native-module configuration.

## Runtime and privacy

Only the iOS dev-client composition root loads the native module. Tests, Expo Go, and other runtimes
keep using deterministic fixtures. The simulator can compile the module but cannot provide any Core
Motion activity or cadence observations — **measured 2026-08-01, not assumed**; see below.

Motion observations remain on device. The module has no analytics, network, persistence, or logging
surface, and cadence values must never be logged or attached to analytics events.

## Verification

Run the JS contract and module tests with:

```sh
npm test --workspace app -- --runInBand src/signals/motion modules/excerlock-motion
```

Run the CNG and deployment guardrails from the repository root with:

```sh
npm run test:guardrails
```

The module has compiled successfully as the `ExcerlockMotion` CocoaPods scheme for the iOS
simulator. Physical-device behavior is still unverified because Core Motion delivers no
activity/cadence data in the simulator and spike #27 has not run. Classification latency, live and
background cadence, treadmill/indoor walking, permission UX, force-quit behavior, and the 65
steps/minute starting threshold all still require hardware validation.

### Core Motion on the simulator — measured 2026-08-01

The sentence above was written as an assumption and carried for weeks untested. It has now been
measured on the iOS 26.4 simulator with a standalone Swift probe compiled against the simulator SDK
and run inside the booted device (`xcrun simctl spawn`). **The assumption was correct, and if
anything understated.**

| Call | Result |
|---|---|
| `CMMotionActivityManager.isActivityAvailable()` | `false` |
| `CMPedometer.isStepCountingAvailable()` | `false` |
| `CMPedometer.isCadenceAvailable()` | `false` |
| live activity/pedometer calls | fail with **`CMErrorMotionActivityNotAvailable` (104)** |

**104 is the decisive detail.** It is not `CMErrorMotionActivityNotAuthorized` (105) or
`NotEntitled` (106) — the sensor backend is absent, not blocked. So no permission, entitlement or
`Info.plist` route can ever change it, and indeed rebuilding the probe with a real bundle identifier
plus `NSMotionUsageDescription`, and granting motion access with
`xcrun simctl privacy <udid> grant motion <bundle-id>`, left the output **byte-for-byte identical**.

Structurally, the simulator runtime ships **no motion daemon** — nothing matching `*motion*` exists
under its `usr/libexec` or `System/Library/LaunchDaemons`. There is also no motion simulation tooling
of any kind: `xcrun simctl` has a `location` subcommand and nothing for motion, steps or sensors, and
there is no GPX equivalent for motion the way there is for GPS. Apple's own archived
"Hardware and API Features Not Supported in Simulator" lists motion under features not simulated.

A private hook (`CMActivityManagerInternal simulateMotionState:withState:withHint:`) does exist in
the runtime binary, but invoking it aborts the process on an uninitialised internal semaphore — and
it is private API regardless. It is not a route.

**Consequence for this module:** `motionAvailabilityPayload()` maps one-to-one onto the three calls
measured `false`, so on a simulator the module degrades to a hard unavailability error and **no Walk
& Scroll code path past the availability gate can ever execute there**. `FixtureMotionProvider`
remains the only way to exercise Walk & Scroll behaviour without hardware — which is what it is for.
