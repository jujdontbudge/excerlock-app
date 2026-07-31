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

The module does not decide whether a person is walking. `WalkVerifier` requires both a walking
classification and sustained cadence at or above
`WALK_CADENCE_THRESHOLD_STEPS_PER_MINUTE`. That app-fixed constant lives only in
`app/src/signals/motion/constants.ts`; its current 65 steps/minute value is the midpoint of the PRD's
60–70 starting band. It is provisional until physical-device spike #27 tunes it and is never a user
setting. Renewable 15-minute access increments and full-price walking are product/session rules,
not native-module configuration.

## Runtime and privacy

Only the iOS dev-client composition root loads the native module. Tests, Expo Go, and other runtimes
keep using deterministic fixtures. The simulator can compile the module but cannot provide useful
Core Motion activity or cadence observations.

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
simulator. Physical-device behavior is still unverified because Core Motion does not deliver useful
activity/cadence data in the simulator and spike #27 has not run. Classification latency, live and
background cadence, treadmill/indoor walking, permission UX, force-quit behavior, and the 65
steps/minute starting threshold all still require hardware validation.
