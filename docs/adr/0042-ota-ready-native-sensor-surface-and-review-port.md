---
status: accepted
date: 2026-09-19
---

# 0042: The first App Store binary carries an OTA-ready sensor surface and a JS-callable review sheet

## Decision

Build 8 (`runtimeVersion` `3`) is the binary that goes to TestFlight and then becomes the first App Store
submission. Before it ships, the native surface grows in four ways, none of which the unlock gate reads:

1. **A JS-callable StoreKit review request.** `runtime.review` (`src/ports/StoreReviewPort.ts`) wraps
   `expo-store-review` — `isAvailable()` and `requestReview()` → `'requested' | 'failed'` — and the real
   runtime routes `requestReview` through `RuntimeSafety.prompt()`, so any OTA bundle can raise Apple's
   system sheet from wherever product decides, with no custom UI and no gating in the port itself
   (`isAvailableAsync` is `false` on TestFlight while the sheet still renders without submitting; the
   caller decides). The fake runtime logs `review_requested`.
2. **Collect-only Core Motion streams in `modules/excerlock-motion`.** `onDeviceMotion` carries attitude
   (roll/pitch/yaw), quaternion, heading (null when the reference frame has none) and the calibrated
   magnetic field with its accuracy; `startDeviceMotion({ referenceFrame })` picks a frame from
   `availableAttitudeReferenceFrames()`. `onCadence` carries pedometer distance, current pace and floors.
   New streams: `startAltimeter`/`stopAltimeter` → `onAltitude` (`CMAltimeter`),
   `startMagnetometer({ intervalMs })`/`stopMagnetometer` → `onMagnetometer`,
   `startPedometerEvents`/`stopPedometerEvents` → `onPedometerEvent` (pause/resume), and
   `recordAccelerometer`/`queryRecordedAccelerometer` (`CMSensorRecorder`). `getAvailability()` reports
   eleven flags, each the framework's own answer; every `start*` checks its flag before touching Core
   Motion and rejects with `ERR_MOTION_UNAVAILABLE` (`SensorUnavailableException` naming the stream).
   `CMSensorRecorder` is guarded by `isAccelerometerRecordingAvailable()` — false on every iPhone to
   date — and never faked.
3. **GPS speed and course from the existing location paths.** `LocationSample` gains `speedMps` and
   `courseDeg` (null when Core Location reports `-1`), read from what `expo-location` already delivers in
   both the task-manager and foreground paths. No new Always grant.
4. **A preview/dev-only smoke and an incident-diagnostics snapshot.** `runSensorStreamSmoke`
   (`src/runtime/detection/sensorStreams.ts`) starts and stops every catalogued stream once, judges each
   answer against its availability flag and probes the recorder; `/diagnostics/sensors`
   (`SensorSmokeScreen`) renders it behind `diagnosticsRoutesEnabled` (preview or dev only; closed in prod
   and therefore in TestFlight/App Store binaries). Incident reports carry `diagnostics.sensors =
   { availability, motionAccess }` — flags only, never readings.

The live unlock math is untouched: `DetectionService`, `MotionAdapter`, `PlacementAdapter` and the walking
machine read exactly what they read at ADR 0041.

## Context

The app is not on the App Store yet; build 7 (ADR 0041's walking-gate candidate) is the last TestFlight.
Anything not in the binary cannot be added later by an OTA update (`plans/ship/02-native-manifest.md`), so
the captain asked for the sensor surface and the review prompt to go into the same binary that becomes the
first submission, while the *use* of both stays a JS/OTA decision.

Permission prompts were already JS-callable and stay so: Motion (`ExcerlockMotion.requestAuthorization`),
Screen Time (`react-native-device-activity.requestAuthorization` through `createNativeScreenTimePort`) and
Location Always (`expo-location.requestBackgroundPermissionsAsync` through `ExpoLocationClient`). No
consent screen was added.

`runtimeVersion` moves `'2'` → `'3'` because the native module's JS-visible surface grew (ADR 0021 set the
precedent when row 32 was added). No OTA for runtime `3` is authorized by this record.

What the simulator can prove. It ships no motion daemon (module README, measured 2026-08-01): all eleven
availability flags are `false` there. `E2E-M1` therefore proves the *bridge* — every function exists in
the release JS bundle, rejects with the documented code rather than crashing or hanging, `stop*` is
idempotent, the recorder is honest, and the second run reads the same — not sensor readings, which stay a
device-lane concern. Two findings shaped the scenario:

- **Motion granted + no Core Motion cannot boot.** With `xcrun simctl privacy grant motion` in place the
  runtime's boot reconcile calls `detection.start()`, `assertUsable()` throws `MotionUnavailableException`
  and the boot gate fails (run `20260919T0448Z`, Sentry `EXCERLOCK-MOBILE-H`); a grant after boot relaunches
  the app into the same state (`20260919T0455Z`). This is pre-existing runtime behaviour, reachable only where
  Motion & Fitness is authorized and `CMMotionActivityManager.isActivityAvailable()` is false — every
  supported iPhone ships Core Motion, so it is simulator-only. It is recorded, not fixed, because a boot-path
  change does not belong in a sensor-collection binary; see follow-ups.
- **An unavailable stream cannot prompt.** Because the Swift guards check availability first, the smoke
  exercises Motion & Fitness–gated streams while authorization is undetermined whenever their flag is
  false, and skips them only when they are available (where a start would raise the prompt). Fresh-install
  `E2E-M1` thus leaves Motion & Fitness `notDetermined` and still exercises all five streams and the
  recorder.

Alternatives considered: a hidden production route for the smoke (rejected — harness-only surfaces stay
out of prod binaries; the guard is a `Stack.Protected` route the screen-coverage guardrail classifies as
non-production); putting review gating into the port (rejected — when/where to ask is product, i.e. OTA);
a custom review UI (rejected by the brief; Apple's sheet only).

Diagnostics key naming: the API's incident denylist forbids the exact key `authorization` at any depth, so
the snapshot names Motion & Fitness `motionAccess`; the client-side mirror regex now matches the server list
so the leak test catches this class before the API does.

## Consequences

- OTA bundles on runtime `3` can collect attitude, heading, magnetic field, altitude, pedometer
  distance/pace/floors/pause-resume, GPS speed/course, and ask for a review, without another binary.
- Runtime `2` (build 7 testers) receives no further OTA from this line; build 8 replaces it on TestFlight.
- `E2E-M1` joins the release-style proof set. The screen-coverage guardrail knows `app/diagnostics/` as a
  non-production directory; `RootNavigator` gates it with `diagnosticsRoutesEnabled`.
- Follow-up (not done here): decide whether a device with Motion & Fitness authorized but no motion
  activity should boot without walking detection instead of failing the boot gate; today it fails,
  which only a simulator reaches.
- Follow-up: device-lane readings for the new streams (a real iPhone run of `/diagnostics/sensors` in a
  preview build) before any OTA depends on them.

## References

- `app-next/modules/excerlock-motion/` (`ios/CoreMotionService.swift`, `ios/CoreMotionPayloads.swift`,
  `ios/ExcerlockMotionModule.swift`, `src/ExcerlockMotion.types.ts`, README).
- `app-next/src/ports/StoreReviewPort.ts`, `app-next/src/runtime/review/createStoreReviewPort.ts`,
  `app-next/src/demo/fakes/ReviewFake.ts`.
- `app-next/src/runtime/detection/sensorStreams.ts`, `app-next/src/features/diagnostics/SensorSmokeScreen.tsx`,
  `app-next/src/runtime/diagnosticsRoutes.ts`, `app-next/app/diagnostics/sensors.tsx`.
- `app-next/src/engine/signals/location/LocationProvider.ts` (`speedMps`, `courseDeg`).
- `app-next/src/runtime/incident/incidentDiagnostics.ts` (`sensors` snapshot); `server/src/incidents/diagnostics.ts` (denylist).
- `app-next/e2e-next/scenarios/m1_sensor_smoke.py`; proven run in `app-next/e2e-next/README.md`.
- `plans/ship/02-native-manifest.md` rows 9 and 31; `docs/agents/operations.md` (runtimeVersion policy).
- ADR 0021 (runtime `2` precedent), ADR 0039 (incident diagnostics denylist), ADR 0041 (the unlock gate this
  record leaves untouched).
