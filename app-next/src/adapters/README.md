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

- **No native import at module scope.** `engine/contracts.ts` re-exports the engine's types with
  `export type`; the concrete bindings live in `nativeEngine.ts` behind lazy `require`s, exactly as
  `engine/signals/location/accessor.ts` does. Importing an adapter never loads JSI, so every test
  runs on the Node jest environment. `__tests__/nativeEngine.test.ts` fails if that stops being true.
- **Timestamps, never increments.** Adapters translate platform callbacks into instants and hand them
  to the domain. Duration is always the difference of two recorded instants.
- **Only `enableAutoDetect` may request Always location.** Every other gym path is When-in-use.
  `gym/__tests__/GymAdapter.test.ts` asserts this against a recording location stub.
- **Every permission answer is recorded.** Adapters route status through `recordPermission` so
  `permissionsStore` is the single place Settings and Home read from.

## Wiring (for P2-T17)

Every adapter is a factory over injected collaborators. `nativeEngine.ts` binds all four to the real
engine, so the composition root builds them once and holds them:

```ts
const { steps, walking, gym, health } = createNativeAdapters({ clock, search: nativePlaceSearch });
```

The individual factories stay exported for a root that wants to substitute one. The gym adapter
defaults to the persisted visit log, so only a test passes `memoryVisitLog()`.

Calling `createNativeAdapters` from a route promotes `createExcerlockMotionModuleClient`,
`createPhonePlacementModuleClient` and `getLocationProvider` out of the pending list in
`guardrails/phase3-production-callers.test.ts`. That guardrail fails until they are moved, which is
the intended handshake: it is what stops a tested adapter from staying dead code.

On `AppState → active`, the root calls `steps.refresh()`, `walking.tick()`, `gym.reconcile()`,
`health.workoutsToday(...)` and `readPermissionHealth({ motion, health: healthEngine, location, camera: gait })`.
On hydration it calls `walking.resume()` for a session that outlived the process.

## Tested against the recordings

`walking/__tests__/fixture-replay.test.ts`, `walking/__tests__/treadmill-recordings.test.ts` and
`gym/__tests__/fixture-replay.test.ts` drive the adapters with the real engine classes and the
recordings P2-T03 moved: the motion timelines, the geofence timelines, and the 10 Hz device motion
recorded on a physical treadmill. `__tests__/fixturePlayback.ts` is the only shim, and it does one
thing — a fixture timeline is relative to zero, so playback shifts it onto the session's origin.

Two rules came out of writing them, and neither was visible against a stubbed verifier:

- The verifier is polled on every tick, not only when a sample arrives. `WalkVerifier` re-evaluates
  on push, so a walk that ends by the pedometer going quiet would otherwise hold its last verified
  verdict until the lease lapsed.
- A `grace` verdict counts as unverified. Waiting for `notWalking` runs the verifier's hysteresis
  and the user's stop grace back to back and pays for a walk that ended a minute earlier.

## Depends on

- **P2-T03's `app.json`** for `NSMotionUsageDescription`,
  `NSLocationAlwaysAndWhenInUseUsageDescription`, the HealthKit share and background-delivery
  entitlements, and `UIBackgroundModes: fetch, location`. Without them every authorization here
  returns `denied` on device.
- **P2-T11** for what only hardware can answer: cadence on a real treadmill, a geofence exit that
  fires with the app killed, an hour-long lease renewal, and whether a workout's duration arrives in
  seconds or minutes.

## Merge notes

None left. P2-T03 and P2-T15 are both merged: the engine types come from `src/engine/signals`, and
the session machine, visit type and contract suites come from `domain/` and `ports/`.
