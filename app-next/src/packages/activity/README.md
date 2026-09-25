# Detection runtime boundary

`DetectionService` is composed once above React navigation and can also be called by a module-scope background task. Raw motion and placement adapters retain native source timestamps and reduce into `detectionStore`; no Home-screen timer owns truth. A recovering serialized queue covers every wake, sensor mutation, external history-credit await and explicit AsyncStorage durability barrier. Account/session generation is revalidated after each await. `reconcileWake` consumes durable gym transitions and historical step deltas through a stable idempotency key and cursor. Root's credit transaction must durably deduplicate that key before resolving; the cursor never advances after an unknown/failed result. History credits targets only and never asserts current walking relief. `noteCoverageLost` invalidates transient live evidence after an unknown process/sensor gap.

Root composition supplies native providers, background-task registration, rule/window scheduling and enforcement reconciliation. The service deliberately imports neither shielding nor navigation. Placement thresholds remain the existing device-recorded classifier values; pickup latency remains a physical-device gate.

The stride discriminator's thresholds are the shipped set in `strideGateConfig.ts` and are remotely retunable through the `stride_gate_config` payload flag inside measured clamps (see ADR 0035). `createStrideGateConfigPort` resolves the payload, rejects it wholesale when any value or invariant fails, applies the resulting report to `MotionAdapter`, and clamps the user's stop-grace into the walking reducer's contract. `runtime.strideGate.report()` is the effective configuration the app ran with; a `killSwitch` value in the payload drops the raw-stream leg without touching the Apple legs.

While the raw stream is live, Apple's activity and cadence legs qualify only through a gait-shaped window (`gaitShapedWindow`) outside the veto penalty, and a phone the stream measures still for `stillStopMs` (10 s) publishes `MotionEvidence.stopped`, which `reduceWalking` treats as an immediate end of relief from any phase; resuming from grace re-verifies for 3 s (ADR 0041). Without a live stream the Apple legs stand alone, as before.

`createNativeDetection` is the concrete iOS composition factory. It binds the local Core Motion module, the unchanged phone-placement classifier, Expo Location, the shared raw gym log, `StepsDetectionAdapter`, `GymRegionAdapter`, and `AwakeSession`. Importing `registerLocationTasks` at module scope persists a geofence callback first and then invokes the factory-registered singleton headless handler; React is not involved. Root must call the factory only in the native runtime, keep its returned owner above navigation, provide the current generation/wake context, and dispose it once. Saved gyms are global configured places (maximum five), not invented per-rule IDs; deletion stops the region before serialized presence invalidation.

`sensorStreams.ts` is the collect-only surface (ADR 0042): a catalogue of every native Core Motion stream the binary exposes beyond what the gate reads (device-motion attitude/heading/magnetic field, altimeter, raw magnetometer, pedometer events, the guarded sensor recorder), `runSensorStreamSmoke` — the JS proof that each starts, stops and answers its availability flag honestly, driven by the preview-only `/diagnostics/sensors` route and `E2E-M1` — and `snapshotSensors`, the flags-only snapshot incident reports carry. `createNativeDetection` exposes the module as `sensors`; nothing in `DetectionService`, `MotionAdapter` or `PlacementAdapter` subscribes to these streams.

# LocationProvider

Contract: geofence regions, presence checks, and walk-session keep-alive behavior behind one provider
interface. Consumers do not import Expo Location or Task Manager directly. Manual check-in is an
additive `ManualGymCheckIn` capability so the shared `LocationProvider` interface remains unchanged.

`FixtureLocationProvider` consumes `location.enterRegion`, `location.exitRegion`, `location.update`,
and `location.authChanged`. History establishes presence synchronously; future region events notify
only regions the caller is monitoring. It remains the singleton default in Jest, Expo Go, and non-iOS
runtimes. A non-Expo-Go iOS runtime fails toward native, including development clients, Standalone
releases, bare builds, and future execution-environment values.

`NativeLocationProvider` preserves the contract over `ExpoLocationClient`, which is the only module
that translates `expo-location` calls. Constructing the provider never requests permission or starts
monitoring.

Saving a gym (`GymSetupLocator.locateForGymSetup`) requests foreground (`When In Use`) permission and
takes one high-accuracy sample while the user stands in the gym; Home's `SaveGymCard` turns it into a
`SavedPlace` circle. Manual check-in requests the same permission, takes one sample, and
checks that sample against the saved circle on device. Starting auto-detect is the explicit opt-in
boundary: it requests foreground permission first, then background (`Always`) permission, and only
then registers regions. At most five gyms are accepted. The public radius constants are 100 m default,
50 m minimum, and 200 m maximum.

Production ownership lives in Home's `GymPresenceController`. An Arrive-at-gym card calls `checkIn`
only after the user presses **Check in**. Settings is the only surface that calls `enableAutoDetect`;
the app-lifetime signal host merely restores a persisted opt-in when `Always` is already granted and
quietly does nothing otherwise. Turning auto-detect off stops registered monitoring while leaving
manual check-in intact. With no enabled location condition, the host neither selects this provider nor
reads location.

Raw presence changes immediately when a region event arrives: there is no dwell state and
`isInsideRegion` does not wait. A separate, invisible 10-second confirmation debounce delays when the
arrival counts; an exit during that window cancels the arrival. Manual and automatic arrivals share
that processor. Confirmed arrivals append only `{regionId, atMs}` to AsyncStorage. Coordinates are used
only in memory for the OS boundary and distance calculation; they are never logged or sent to
analytics.

The app-open reconciliation also claims coordinate-free visits persisted by a background task. Ledger
event ids make replay idempotent, so reading the on-device visit log again cannot double-pay an arrival.
The E2E composition root installs its selected `FixtureLocationProvider` before runtime hosts mount;
production and scenario adapters cannot be mixed.

`registerLocationTasks` is imported at the Expo Router entry module so Task Manager can find both task
definitions during a headless launch. The geofence task owns the confirmation processor and on-device
visit log. The Walk task maps continuous background locations into `LocationSample` callbacks without
persisting them. Walk keep-alive starts foreground-authorized high-accuracy Fitness updates with the
iOS background-location indicator visible, and stops them explicitly. Expo permission and registered
task state are rehydrated after a JS reload.

Automated tests cover the shared provider contract, five-gym/radius limits, exact 10-second timing,
quick enter-exit cancellation, permission prompt timing, SDK translation, module-scope registration,
fixture-default selection, coordinate-free persistence, and native-state hydration. This lane had no
physical iPhone. Simulator tests cannot establish that iOS relaunches the app for a real region event
or grants the headless task enough execution time to finish the 10-second debounce and persist the
visit; those checks remain mandatory before claiming physical-device geofencing. If the Task Manager
window is too short, the debounce must move into a small native Swift module without widening
`LocationProvider`.

Prove gym behaviour with `./excer prove gym`.

# Phone placement

Public seam for classifying a phone as propped, in hand, or unknown from
`CMDeviceMotion` gravity and rotation-rate samples. The provider is a dumb
sensor pipe; fixture playback and classification stay deterministic in
TypeScript.

`NativePhonePlacementProvider` adapts the local `excerlock-motion` module's
device-motion stream. `PhonePlacementClassifier` computes two features per
one-second window — the largest gravity deviation from the window mean, and the
median rotation-rate magnitude — and decides on their medians over a three-second
horizon. A walking hand cannot hold a pose: measured on a treadmill it swings
gravity by ≥0.039 g in 95 % of windows and rotates at ≥0.32 rad/s, while a phone
propped on the running console stays within 0.015 g and 0.26 rad/s apart from
sub-second jolts. The thresholds (0.03 g, 0.45 rad/s) sit between those bands
and the pooled horizon absorbs the jolts. Leaving `propped` needs three seconds
of continuous hand evidence; a set-down needs 1.5 seconds. Real device
recordings of both cases are in git history (`treadmillRecordings.json`, removed
with the test suites; ADR 0045).

# MotionProvider

This layer is a dumb native/fixture sensor pipe. It publishes source and reception timestamps for motion activity, cadence, and history; it never decides whether apps unlock.

Runtime-root `DetectionService` and `MotionAdapter` own the single policy path. Walking qualifies after three continuous seconds of medium-confidence walking/running **or** cadence of at least 80 steps/minute. Freshness is tracked per source: quiet change-driven classification is not sensor death while cadence remains fresh, while total supported-evidence silence becomes unknown after five seconds. The persisted walking reducer owns the one-shot 30-second-to-five-minute stop grace. Historical queries credit targets only and never manufacture current live relief.

`NativeMotionProvider` is used by supported native builds. Tests and demo scenarios use typed physical evidence with the same pure reducer; they do not fabricate public sessions or enforcement deadlines. Motion timing and background delivery remain physical-device gates.

