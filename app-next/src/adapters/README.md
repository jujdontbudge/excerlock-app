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

## Merge notes

`engine/` and `pending/` are temporary. See each directory's README.
