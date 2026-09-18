# engine

T01 native-engine port (B12 port-don't-rewrite). Verbatim from `app/src/signals`
(excluding `screentime` composition/fakes, `vendor` integrations, Clerk, ledger
and time-bank) into `engine/signals`, plus `engine/nativeIosRuntime.ts` for the
shared iOS-build discriminator. `engine/walking` and `engine/gym` are
compile-only selection stubs here; T11 wires the Motion/Placement/Gym adapters.

| Directory | What it is |
| --- | --- |
| `signals/motion` | `CMPedometer` / `CMMotionActivity` providers and `WalkVerifier` |
| `signals/gait` | Vision pose provider, periodicity detector and real-footage fixtures |
| `signals/placement` | propped-vs-handheld classifier and treadmill recordings |
| `signals/location` | Expo Location, geofence task runtime, 10 s arrival confirmation, gym visit log |
| `signals/health` | HealthKit client and workout totals |
| `signals/timeline` | fixture timeline player every fixture provider replays |
| `screentime` (sibling `src/screentime`, not under `engine`) | FamilyControls/DeviceActivity native edge; ledger workspace types kept to compile |
| `walking` | provider selection for the walking adapters (T11) |
| `gym` | gym path lives in `signals/location` (see its README) |
| `nativeIosRuntime.ts` | the one test for "is this a real native build" |

Fences: `react-native-device-activity` only in `src/screentime/native`.
