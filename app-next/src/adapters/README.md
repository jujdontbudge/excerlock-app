# Adapters

Native implementations of the ports. Every adapter is a plain factory over an injected engine
boundary, so a test drives it with a stub and the production composition root (P2-T17) supplies the
real engine.

| Adapter | Port | Engine it wraps |
| --- | --- | --- |
| `steps/StepsAdapter` | `StepsPort` | Core Motion activity + pedometer (`engine/signals/motion`) |
| `walking/WalkingAdapter` | `WalkingPort` | `WalkVerifier`, placement classifier, location keep-alive |
| `gym/GymAdapter` | `GymPort` | geofence transitions (`engine/signals/location`) + Apple Maps search |
| `health/HealthAdapter` | `HealthPort` | HealthKit workouts (`engine/signals/health`) |

## Laws

- **No native import at module scope.** `engine/contracts.ts` declares the interfaces; the concrete
  bindings live in `*/create*.ts` factories that `require` lazily, exactly as the Phase 1 engine did.
  Importing an adapter never loads JSI, so every test runs on the Node jest environment.
- **Timestamps, never increments.** Adapters translate platform callbacks into instants and hand them
  to the domain. Duration is always the difference of two recorded instants.
- **Only `enableAutoDetect` may request Always location.** Every other gym path is When-in-use.
  `gym/__tests__/GymAdapter.test.ts` asserts this against a recording location stub.
- **Every permission answer is recorded.** Adapters route status through `recordPermission` so
  `permissionsStore` is the single place Settings and Home read from.

## Wiring (for P2-T17)

Every adapter is a factory over injected collaborators, so the composition root builds them once and
holds them. The engine modules below are P2-T03's; nothing here loads a native module by itself.

```ts
const motion = new NativeMotionProvider(createExcerlockMotionModuleClient());
const location = getLocationProvider();

const steps = createStepsAdapter({ motion, clock });
const walking = createWalkingAdapter({
  clock, motion, location,
  createVerifier: (options) => new WalkVerifier(options),
  createPlacement: () => createWalkingPlacementRuntime(),
  createClassifier: () => new PhonePlacementClassifier(),
});
const gym = createGymAdapter({
  clock, engine: location, search: nativePlaceSearch,
  visitLog: visitLogFromStore(),                       // after P2-T15; see pending/README.md
  backgroundVisits: () => createAsyncStorageGymVisitLog().readAll(),
});
const health = createHealthAdapter({ clock, engine: requireKingstinctWorkoutEngine() });
```

On `AppState → active`, the root calls `steps.refresh()`, `walking.tick()`, `gym.reconcile()`,
`health.workoutsToday(...)` and `readPermissionHealth({ motion, health: healthEngine, location, camera: gait })`.
On hydration it calls `walking.resume()` for a session that outlived the process.

## Depends on

- **P2-T03** for the engine modules above, and for the `app.json` entries these adapters need:
  `NSMotionUsageDescription`, `NSLocationAlwaysAndWhenInUseUsageDescription`, the HealthKit share and
  background-delivery entitlements, and `UIBackgroundModes: fetch, location`. Without them every
  authorization here returns `denied` on device.
- **P2-T15** for the session machine, the visit type and the contract suites. See `pending/README.md`.
- **P2-T11** for what only hardware can answer: cadence on a real treadmill, a geofence exit that
  fires with the app killed, an hour-long lease renewal, and whether a workout's duration arrives in
  seconds or minutes.

## Merge notes

`engine/` and `pending/` are temporary. See each directory's README.
