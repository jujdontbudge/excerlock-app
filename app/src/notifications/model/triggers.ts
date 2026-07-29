/**
 * The three trigger conditions from PRD §3.14, and the moment each one fires.
 *
 * Every function here is total, pure, and takes the day's facts as an argument:
 * this module computes nothing about the user and asks nothing of a server. The
 * facts arrive from the on-device ledger; the planner turns a `true` here into a
 * locally-scheduled notification.
 */

/** `0` is Sunday, matching `Date#getDay` and the *Start week on* setting. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Everything a trigger may know about today. Facts only — no verdicts. */
export type NotificationDayFacts = Readonly<{
  /** The ledger's day index: an epoch day shifted by the user's day boundary. */
  dayIndex: number;
  /** Local wall-clock milliseconds at this day's start. */
  dayStartMs: number;
  /** A scheduled active day, per the weekly schedule (PRD §3.10). */
  isActiveDay: boolean;
  hasQualifyingActivity: boolean;
  /** Go-quiet-on-openers: any app open today silences today's engagement push. */
  appOpenedToday: boolean;
  streakRequirementMet: boolean;
  streakDays: number;
}>;

export type NotificationWeekFacts = Readonly<{
  weekStartsOn: Weekday;
}>;

/** PRD §3.14: the recap moment is the last day of the week at 18:00. */
export const WEEKLY_RECAP_MINUTE_OF_DAY = 18 * 60;

/**
 * App-fixed, not user-set. The PRD says "in the evening"; 20:00 is late enough
 * to be a last call and leaves two clear hours before quiet hours start, so the
 * user can still act on it.
 */
export const STREAK_LAST_CALL_MINUTE_OF_DAY = 20 * 60;

const EPOCH_DAY_WEEKDAY = 4; // 1970-01-01 was a Thursday.

export function weekdayIndex(dayIndex: number): Weekday {
  return ((((dayIndex + EPOCH_DAY_WEEKDAY) % 7) + 7) % 7) as Weekday;
}

/** How many days into its week this day sits. The week's last day is offset 6. */
export function weekOffset(dayIndex: number, weekStartsOn: Weekday): number {
  return (weekdayIndex(dayIndex) - weekStartsOn + 7) % 7;
}

/** "active day + no qualifying activity yet + app not opened today". */
export function shouldFireAfternoonNudge(day: NotificationDayFacts): boolean {
  return day.isActiveDay && !day.hasQualifyingActivity && !day.appOpenedToday;
}

/**
 * The last day of the week, aligned to *Start week on*. Deliberately not an
 * engagement push: it reports a finished week rather than chasing today, so an
 * app open does not cancel it.
 */
export function shouldFireWeeklyRecap(
  day: NotificationDayFacts,
  week: NotificationWeekFacts,
): boolean {
  return weekOffset(day.dayIndex, week.weekStartsOn) === 6;
}

/**
 * "the day's streak requirement is unmet and the app is unopened", plus a streak
 * that actually exists — not a fourth rule, but a consequence of the copy: with
 * `streakDays` at zero the title would read "0-day streak on the line", which
 * has nothing on the line and reads as a scold.
 */
export function shouldFireStreakLastCall(day: NotificationDayFacts): boolean {
  return !day.streakRequirementMet && !day.appOpenedToday && day.streakDays >= 1;
}
