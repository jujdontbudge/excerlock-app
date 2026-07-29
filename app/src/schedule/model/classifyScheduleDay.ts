import { dayIndexFor } from "@excerlock/ledger";

import type {
  OverrideDirection,
  ScheduleRules,
  Weekday,
} from "./scheduleRules";

export type ScheduledActiveDay = Readonly<{
  kind: "scheduledActive";
  isActive: true;
}>;

export type RestDay = Readonly<{
  kind: "rest";
  isActive: false;
}>;

export type HolidayDay = Readonly<{
  kind: "holiday";
  isActive: false;
}>;

export type OverrideDay = Readonly<{
  kind: "override";
  direction: OverrideDirection;
  isActive: boolean;
}>;

export type ScheduleDay =
  | ScheduledActiveDay
  | RestDay
  | HolidayDay
  | OverrideDay;

export type ClassifyScheduleDayInput = Readonly<{
  dayIndex: number;
  schedule?: ScheduleRules;
}>;

export type ClassifyScheduleAtInput = Readonly<{
  /**
   * Local wall-clock milliseconds, after the app edge has absorbed timezone
   * and DST. This is the timestamp convention required by the ledger.
   */
  localWallClockMs: number;
  dayBoundaryOffsetMinutes: number;
  schedule?: ScheduleRules;
}>;

/** Classifies a moment by first asking the ledger which configured day owns it. */
export function classifyScheduleAt(
  input: ClassifyScheduleAtInput,
): ScheduleDay {
  return classifyScheduleDay({
    dayIndex: dayIndexFor(
      input.localWallClockMs,
      input.dayBoundaryOffsetMinutes,
    ),
    schedule: input.schedule,
  });
}

/**
 * The one schedule precedence law:
 *
 * one-day override > holiday range > recurring rest weekday > active.
 *
 * The local-first fallback is active: until a schedule exists, no day is
 * withheld from the normal earning and locking economy.
 */
export function classifyScheduleDay(
  input: ClassifyScheduleDayInput,
): ScheduleDay {
  const { dayIndex, schedule } = input;
  const override = schedule?.overrides.find(
    (candidate) => candidate.dayIndex === dayIndex,
  );
  if (override !== undefined) {
    return {
      kind: "override",
      direction: override.direction,
      isActive: override.direction === "active",
    };
  }

  const isHoliday = schedule?.holidays.some(
    ({ startDayIndex, endDayIndex }) =>
      dayIndex >= startDayIndex && dayIndex <= endDayIndex,
  );
  if (isHoliday === true) {
    return { kind: "holiday", isActive: false };
  }

  if (
    schedule?.recurringRestWeekdays.includes(weekdayForDayIndex(dayIndex)) ===
    true
  ) {
    return { kind: "rest", isActive: false };
  }

  return { kind: "scheduledActive", isActive: true };
}

const EPOCH_DAY_WEEKDAY = 4; // 1970-01-01 was a Thursday.

export function weekdayForDayIndex(dayIndex: number): Weekday {
  return ((((dayIndex + EPOCH_DAY_WEEKDAY) % 7) + 7) % 7) as Weekday;
}

export type {
  DayOverride,
  HolidayRange,
  OverrideDirection,
  ScheduleRules,
  Weekday,
} from "./scheduleRules";
