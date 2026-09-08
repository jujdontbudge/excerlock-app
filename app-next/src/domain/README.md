# Domain

Pure rules, schedules, lock precedence, progress, streaks and reclaimed-time math. No React or IO. Tests enforce 100% branch coverage. Input rules are validated at store and editor boundaries.

Calendar math uses the supplied IANA timezone. DST gaps shift forward by the gap; repeated times use the first occurrence. A cross-midnight instance keeps the day it starts on. Met records latch and never move to a new timezone day.

Visible domain labels are composed from src/content/domain.ts.

`walkingDuration.ts` owns the duration target's bounds and defaults. `migrateRule.ts` rewrites the legacy,
unsatisfiable treadmill step target to an either-place step target before persisted rules are validated.
