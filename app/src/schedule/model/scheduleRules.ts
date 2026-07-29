/** `0` is Sunday, matching `Date#getDay`. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type HolidayRange = Readonly<{
  startDayIndex: number;
  endDayIndex: number;
}>;

export type OverrideDirection = "active" | "rest";

export type DayOverride = Readonly<{
  dayIndex: number;
  direction: OverrideDirection;
}>;

export type ScheduleRules = Readonly<{
  recurringRestWeekdays: readonly Weekday[];
  holidays: readonly HolidayRange[];
  overrides: readonly DayOverride[];
}>;

/** An explicit all-active schedule; also the fallback when no schedule exists. */
export const ALL_DAYS_ACTIVE: ScheduleRules = Object.freeze({
  recurringRestWeekdays: Object.freeze([]),
  holidays: Object.freeze([]),
  overrides: Object.freeze([]),
});
