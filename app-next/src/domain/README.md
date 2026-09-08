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

Visible domain labels are composed from `src/content/`.

`conditionState` is the single pure projection of a rule, its day row and the lock decision into the state
rendered by condition lists. The paused reason is persisted on the rule; the sensor reading is passed in by
the caller, so no stale copy of a permission lives on a rule.

**Timestamps are the source of truth.** Every duration is the difference of two recorded instants, clamped to at least zero and to the interval it is attributed to, and every write is a recomputation from those instants, never an increment. A walking session carries a `creditedThrough` high-water mark, so a replay, a relaunch, a background wake and a foreground tick all produce the same number. Deadlines are instants; rollover is a changed day key, never a twenty-four-hour timer.

**Two day ledgers, two questions.** `RuleDay` is keyed by the instance day and answers whether a rule was satisfied, so a window that crosses midnight keeps every minute on the day it opened. `HistoryDay` is keyed by the calendar day and answers what happened on a date; `splitAtMidnight` is how a writer attributes an interval that crosses local midnight to each date it touches. Walking minutes therefore reach the rule day only: `HistoryDay.activity.walking` is a step count owned by the pedometer, and gym dwell is clipped to each day by `gymDwell`. `progressDay` decides which day a rule row belongs to and returns null when the rule is not scheduled, meaning no row is written at all. `sealDay` stamps each past day once: a day the app already recorded keeps what it recorded, and a scheduled day the app never opened seals as missed so the streak breaks honestly.

