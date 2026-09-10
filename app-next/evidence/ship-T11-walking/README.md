# T11 native WalkingPort bridge

`NativeWalkingPort` projects the persisted detection reducers through the public WalkingPort without introducing a second state writer. It uses the same `DetectionService`, `MotionAdapter`, and `PlacementAdapter` created by native detection. Manual checks are hard-bounded to three seconds, sample fused live activity/cadence evidence, and commit through the service's serialized durability queue. Only enabled state-walking rules can start live relief.

Propped scan passes now persist their authoritative event timestamp as `verifiedSince`. Legacy v1 snapshots whose live propped phase lacks that timestamp grant no relief and reduce to inactive, requiring a foreground rescan. Pickup qualification is coupled to walking state; put-down replaces walking with the dedicated 60-second handoff so normal walking grace cannot stack after it.

Verification on 2026-09-10:

- `npm run typecheck --workspace app-next` — pass
- `npm run lint --workspace app-next` — pass with 35 pre-existing warnings, zero errors
- focused reducer/service/port tests — 3 suites, 20 tests passed
- full Jest — 210 suites, 948 tests, 13 snapshots passed
- `git diff --check` — pass

No physical-device motion, placement latency, suspension, or enforcement behavior is proven by these tests.
