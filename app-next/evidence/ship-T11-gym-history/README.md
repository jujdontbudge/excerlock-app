# T11 gym history projection

`projectGymHistory` converts persisted, confirmed `GymInterval` values into event-arrival and gym-minute `RuleDay` progress. Callers must pass the currently configured region ids; stale/deleted regions are ignored. Confirmations and dwell apply to any scheduled local day, including before the blocking window (get-ahead).

All configured-region intervals are unioned before splitting at timezone-correct local midnights, so overlapping gyms never double-credit. Dwell begins at `confirmedAt`, not raw entry, and an open confirmed interval is clamped to the supplied observation time. Event completion is stamped at confirmation; minute completion is stamped at the exact union-duration threshold. Existing earned timestamps and unrelated rows are preserved.

Verification on 2026-09-10:

- focused projection + gym reducer tests — 2 suites, 13 tests passed
- lint — zero errors (41 repository warnings)
- `git diff --check` — pass
- full Jest — 219 suites, 999 tests, 13 snapshots passed
- repository typecheck is blocked by two pre-existing test fixtures on primary `930281ab` that still pass removed `creditHistory` to DetectionService; the new projection files introduce no reported TypeScript error

Walking-minute history is deliberately not projected: no measured historical duration source is available, and step counts are not converted into fabricated minutes. No device geofence behavior is proven.
