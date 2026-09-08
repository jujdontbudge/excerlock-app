# engine

The built-and-tested native engine, moved from the old app by P2-T03 under
decision B12: unchanged inside, re-wired outside. Nothing here is a port
(`src/ports`) or a domain rule (`src/domain`). It is the layer the adapters of
P2-T04 and P2-T05 are written over.

| Directory | What it is |
| --- | --- |
| `signals/motion` | `CMPedometer` / `CMMotionActivity` providers and `WalkVerifier` |
| `signals/gait` | the Vision pose provider, the periodicity detector, the treadmill scan controller and the real-footage fixtures |
| `signals/placement` | the propped-vs-handheld classifier and its treadmill recordings |
| `signals/location` | Expo Location, the geofence task runtime, the 30-second arrival confirmation and the on-device gym visit log |
| `signals/health` | the HealthKit client and workout totals |
| `signals/timeline` | the fixture timeline player every fixture provider replays |
| `screentime/native` | FamilyControls, ManagedSettings and DeviceActivity |
| `shield` | the app-group transport the two Swift extensions read |
| `walking` | provider selection for the walking adapters |
| `gym` | see its README: the gym path lives in `signals/location` |
| `nativeIosRuntime.ts` | the one test for "is this a real native build" |

Every provider comes in three shapes — an interface, a fixture implementation
and a native implementation — and a contract suite under `testing/` that both
implementations pass. Fixture manifests are JSON, versioned, and validated on
load, so an invented payload field fails before a scenario can play.

## What did not move

Each affected directory's README says so precisely. In short: the ledger-era
Screen Time composition root and mock, the shield copy composition, the walking
and gym controllers, and the diagnostics screen and instrumentation. All of them
stood on the old condition model, home store or lock precedence, and app-next
already decides the same things in `src/domain` and composes its runtime in
`src/runtime/createRuntime.ts`.

## Fences that hold this in place

`guardrails/rnda-imports.test.ts` allows `react-native-device-activity` only in
`engine/screentime/native` and `engine/shield`.
`guardrails/phase3-production-callers.test.ts` fails the moment a native
accessor is wired up without being promoted out of its pending list.
