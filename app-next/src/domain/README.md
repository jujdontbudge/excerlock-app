# Domain

Pure rules, schedules, lock precedence, progress, streaks and reclaimed-time math. No React or IO. Tests enforce 100% branch coverage. Input rules are validated at store and editor boundaries.

Calendar math uses the supplied IANA timezone. DST gaps shift forward by the gap; repeated times use the first occurrence. A cross-midnight instance keeps the day it starts on. Met records latch and never move to a new timezone day.

Visible domain labels are composed from src/content/domain.ts.

`conditionState` is the single pure projection of a rule, its day row and the lock decision into the state rendered by condition lists. Sensor and paused-reason inputs are temporary additive fields until the Phase 2 enforcement and rule-lifecycle tasks land.
