# adapters

Real-world boundaries: the implementations of the ports in `src/ports`, plus the few boundaries that are
not ports of their own (the VPS API client, the App Store links and the rating policy). Each directory is
one responsibility with a README, and is the only place that knows its vendor or wire format; features keep
talking to the port, and `src/demo/fakes` keeps a local fake of the same interface. Nothing here is imported
by `domain/`; adapters are composed by the runtime root, and screens reach them through `runtime`
composition or, for the few Settings rows that are pure device actions (Rate, Share, Manage subscription),
directly.

The rule that makes this worth a directory: everything above a port sees the port. A screen never
learns which analytics vendor exists, whether one is configured, or whether the person opted out —
it calls `runtime.analytics.track(...)` and the adapter decides what that means. `createRuntime`
picks the adapter or the demo fake; a build with no keys keeps the fake, so a missing key is never a
crash and never a branch at a call site.

- `analytics/` — `AnalyticsPort` over `posthog-react-native`, and the person-properties binding.
- `api/` — the HTTP client to the VPS on Supabase JWTs, `SupportPort` over `POST /v1/support`,
  account deletion over `DELETE /v1/user`, and the failure-to-copy mapping.
- `appStore/` — the App Store id and the product, write-review and manage-subscription URLs.
- `gym/` — `GymPort` over geofence transitions and Apple Maps search.
- `health/` — `HealthPort` over the HealthKit workout reader.
- `notifications/` — `NotificationsPort` over expo-notifications: the trial and walk-lease schedulers,
  the catalog and the tap-through landing table.
- `review/` — the App Store rating policy binding and the only `expo-store-review` import.
- `screentime/` — `ScreenTimePort` over DeviceActivity: merged windows as absolute schedules.
- `steps/` — `StepsPort` over Core Motion's pedometer.
- `sync/` — `SyncPort` over the VPS `/v1/sync/*` endpoints (P2-T08): outbox, schedule, restore merge.
- `walking/` — `WalkingPort` over the walk verifier, the placement classifier and the location keep-alive.

Crash reporting is not a port: it has no product behaviour to fake and nothing calls it in a flow.
It lives in `src/observability` and is wired at the app entry and the root error boundary.

The four native adapters are plain factories over an injected engine boundary, so a test drives one
with a stub and the composition root supplies the real engine.

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
