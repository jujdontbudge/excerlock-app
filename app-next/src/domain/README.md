# Domain

Pure rules, schedules, enforcement decisions, progress, streaks and reclaimed-time math. No React or IO. Tests enforce 100% branch coverage. Input rules are validated at store and editor boundaries. The sole precedence statement is `plans/rebuild/01-product-model.md` §3.

`entitlementAccess` is the single routing policy for subscription status. A lapse keeps the app mounted and
requests a dismissible modal; only a user who has never subscribed is held at the hard paywall. An unknown
status remains on the boot surface while the runtime resolves its persisted last-known-good status.

`identity` holds the SDK ordering law: bind identifies subscription then analytics; teardown resets
subscription, then analytics, and releases the auth provider last. `mergeRestoredEntitlement` keeps a
restore from ever downgrading a live entitlement.

Calendar math uses the supplied IANA timezone. DST gaps shift forward by the gap; repeated times use the first occurrence. A cross-midnight instance keeps the day it starts on. `watermark.ts` clamps ordinary clock rewinds, while rewinds greater than 26 hours are treated as a restore.

`lockIntervals.ts` expands enabled schedules and merges overlapping or adjacent windows. `monitorPlan.ts` turns that union into deterministic, absolute monitors capped by `LOCK_WINDOW_BUDGET`; a truncated plan fails closed. The timeline and native adapter consume this same union rather than reimplementing schedule geometry.

`RuleDay` is mutable per-condition progress. `EarnedUnlock` is the immutable enforcement fact written when progress first becomes met, so rule edits cannot revoke an earned day. Aggregated day history is a separate analytics projection and must not drive enforcement.

For `unlockedMet`, `relockAt: null` means clear shields until a rule is enabled again, not forever. `afterWindow` means an instance belonging to today, or yesterday's overnight instance, ended today; `noRulesToday` means nothing was scheduled today. Both carry `nextLockAt`, and `null` means there is no enabled start in the search horizon.

`walkingDuration.ts` owns the walk-for-minutes target's bounds and defaults. `migrateRule` rewrites the
legacy, unsatisfiable treadmill step target to an either-place step target before persisted rules are
validated, in the same pass that widens a too-short window.

`syncMerge` is the restore conflict rule (D5, P2-T08): a remote row is taken only when the device has none
or the remote `updatedAt` is strictly newer than the device's own change clock for that row; today's rows are
device-authoritative and never replaced; rule deletions are explicit tombstones in both directions. It never
touches the app selection.

Visible domain labels are composed from `src/content/`.

`conditionState` is the single pure projection of a rule, its day row and the lock decision into the state
rendered by condition lists. Sensor and paused-reason inputs are temporary additive fields until the Phase 2
enforcement and rule-lifecycle tasks land.

