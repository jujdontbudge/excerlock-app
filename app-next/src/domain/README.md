# Domain

Pure rules, schedules, enforcement decisions, progress, streaks and reclaimed-time math. No React or IO. Tests enforce 100% branch coverage. Input rules are validated at store and editor boundaries. The sole precedence statement is `plans/rebuild/01-product-model.md` §3.

Calendar math uses the supplied IANA timezone. DST gaps shift forward by the gap; repeated times use the first occurrence. A cross-midnight instance keeps the day it starts on. `watermark.ts` clamps ordinary clock rewinds, while rewinds greater than 26 hours are treated as a restore.

`lockIntervals.ts` expands enabled schedules and merges overlapping or adjacent windows. `monitorPlan.ts` turns that union into deterministic, absolute monitors capped by `LOCK_WINDOW_BUDGET`; a truncated plan fails closed. The timeline and native adapter consume this same union rather than reimplementing schedule geometry.

`RuleDay` is mutable per-condition progress. `EarnedUnlock` is the immutable enforcement fact written when progress first becomes met, so rule edits cannot revoke an earned day. Aggregated day history is a separate analytics projection and must not drive enforcement.

For `unlockedMet`, `relockAt: null` means clear shields until a rule is enabled again, not forever. `afterWindow` means an instance belonging to today, or yesterday's overnight instance, ended today; `noRulesToday` means nothing was scheduled today. Both carry `nextLockAt`, and `null` means there is no enabled start in the search horizon.

Visible domain labels are composed from `src/content/`.
