# Domain

Pure rules, schedules, lock precedence, progress, streaks and reclaimed-time math. No React or IO. Tests enforce 100% branch coverage. Input rules are validated at store and editor boundaries.

Calendar math uses the supplied IANA timezone. DST gaps shift forward by the gap; repeated times use the first occurrence. A cross-midnight instance keeps the day it starts on. Met records latch and never move to a new timezone day.

**Timestamps are the source of truth.** Every duration is the difference of two recorded instants, clamped to at least zero and to the interval it is attributed to, and every write is a recomputation from those instants, never an increment. A walking session carries a `creditedThrough` high-water mark, so a replay, a relaunch, a background wake and a foreground tick all produce the same number. Deadlines are instants; rollover is a changed day key, never a twenty-four-hour timer.

**Two day ledgers, two questions.** `RuleDay` is keyed by the instance day and answers whether a rule was satisfied, so a window that crosses midnight keeps every minute on the day it opened. `HistoryDay` is keyed by the calendar day and answers what happened on a date; `splitAtMidnight` is how a writer attributes an interval that crosses local midnight to each date it touches. Walking minutes therefore reach the rule day only: `HistoryDay.activity.walking` is a step count owned by the pedometer, and gym dwell is clipped to each day by `gymDwell`. `progressDay` decides which day a rule row belongs to and returns null when the rule is not scheduled, meaning no row is written at all. `sealDay` stamps each past day once: a day the app already recorded keeps what it recorded, and a scheduled day the app never opened seals as missed so the streak breaks honestly.

Visible domain labels are composed from src/content/domain.ts.
