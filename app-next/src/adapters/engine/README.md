# Engine boundary (temporary)

`contracts.ts` declares the slice of the Phase 1 native engine the adapters consume. The
declarations are copied verbatim from `app/src/signals/{motion,placement,location,health}` so the
shapes cannot drift.

**Delete this directory when P2-T03 lands.** It moves those files to `src/engine/signals/**`; the
migration is then a find-and-replace of `../engine/contracts` for the engine's own modules, plus:

- `MotionProvider`, `ActivitySample`, `CadenceSample`, `WalkVerdict` → `engine/signals/motion`
- `PhonePlacementProvider`, `PhonePlacementResult` → `engine/signals/placement`
- `LocationProvider`, `GeofenceRegion`, `RegionTransition`, `ManualGymCheckIn` → `engine/signals/location`
- `HealthAuthorizationStatus` → `engine/signals/health`

`WorkoutRecord` and `HealthWorkoutEngine` are the exception: they are new here because the Phase 1
`HealthKitClient.queryWorkouts` collapses every workout to a duration and drops the activity type,
the distance and `wasUserEntered`. `health/createKingstinctWorkoutEngine.ts` implements them over
the same Kingstinct module the Phase 1 client uses, and it stays after P2-T03 lands.
