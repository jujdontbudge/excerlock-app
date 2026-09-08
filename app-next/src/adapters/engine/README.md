# Engine boundary

`contracts.ts` is the slice of the native engine the adapters consume. Since P2-T03 landed, every
provider type is re-exported from `src/engine/signals/**` rather than redeclared, so the shapes
cannot drift: change one in the engine and the adapters stop compiling.

Three things are declared here rather than re-exported, because the engine has no equivalent:

- `WalkVerifierLike` and `PhonePlacementClassifierLike` narrow the engine's two classes to the
  methods the adapters call. `WalkingAdapter` takes them as factories, which is what lets a test
  state a verdict instead of constructing a cadence window. The real classes satisfy both, and
  `walking/__tests__/fixture-replay.test.ts` and `treadmill-recordings.test.ts` prove it by driving
  the adapters with the real `WalkVerifier` and `PhonePlacementClassifier`.
- `GymLocationEngine` is `LocationProvider & ManualGymCheckIn`, the two halves `GymAdapter` uses.
  The engine's own `AppLocationProvider` adds `GymSetupLocator`, which nothing here calls.
- `WorkoutRecord` and `HealthWorkoutEngine` are new. `engine/signals/health`'s `HealthKitClient`
  collapses a workout to its duration and drops the activity type, the distance and
  `HKWasUserEntered`, all three of which the rules need. `health/kingstinctWorkouts.ts` implements
  them over the same Kingstinct module.

Every re-export is `export type`. Importing an adapter therefore loads no native module, and the
whole layer runs under plain jest. `../nativeEngine.ts` holds the concrete bindings behind lazy
`require`s, and `__tests__/nativeEngine.test.ts` fails if one of them moves to module scope.
