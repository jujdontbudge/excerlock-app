import type { DaySummary } from "@excerlock/ledger";

import type { ScheduleDay } from "@/schedule";

import {
  sameMonth,
  sameYear,
  weekdayInitial,
  weekOffset,
  type Weekday,
} from "./calendar";

/**
 * Pure reads over an ascending, contiguous run of `DaySummary` records. Every
 * function is total: an empty ledger is a first-class input, never a crash.
 * Nothing here recomputes ledger math — the summaries already carry it.
 */

export const DEFAULT_WEEK_STARTS_ON: Weekday = 1; // Monday.

export type DayRange = readonly DaySummary[];
export type AnalysisPeriod = "week" | "month" | "year";

export type Totals = {
  earnedMinutes: number;
  spentMinutes: number;
  usageMinutes: number;
  /** Earned minus spent — positive means the window banked more than it burned. */
  netMinutes: number;
  /** Days that met the §3.13 meaningful-activity bar. */
  activeDays: number;
  dayCount: number;
};

export type Streak = {
  /** The meaningful run carried through the last day on record. */
  current: number;
  longest: number;
};

export type StreakDayClassifier = (dayIndex: number) => ScheduleDay;

export type Bar = {
  dayIndex: number;
  dayStartMs: number;
  /** The weekday initial under the column. */
  label: string;
  earnedMinutes: number;
  spentMinutes: number;
  /** `0…1` against the busiest minute in the window — the drawn bar height. */
  earnedFraction: number;
  spentFraction: number;
  meaningfulActivity: boolean;
};

/** The most recent day on record. Phase 2 has no clock: "today" is simply the last summary. */
export function selectToday(days: DayRange): DaySummary | null {
  return days.at(-1) ?? null;
}

/** The calendar week that contains the last day on record — partial while the week is young. */
export function selectWeek(
  days: DayRange,
  { weekStartsOn = DEFAULT_WEEK_STARTS_ON }: { weekStartsOn?: Weekday } = {},
): DaySummary[] {
  const today = selectToday(days);
  if (today === null) return [];

  const firstDayIndex = today.dayIndex - weekOffset(today, weekStartsOn);
  return days.filter((day) => day.dayIndex >= firstDayIndex && day.dayIndex <= today.dayIndex);
}

/**
 * The week before the one containing today — the recap's delta window (PRD §3.13
 * row ①). Partial when the record does not reach the whole way back, empty when
 * it does not reach at all: a first week has nothing to compare against, and
 * that is a fact the recap states rather than a zero it invents.
 */
export function selectPreviousWeek(
  days: DayRange,
  { weekStartsOn = DEFAULT_WEEK_STARTS_ON }: { weekStartsOn?: Weekday } = {},
): DaySummary[] {
  const week = selectWeek(days, { weekStartsOn });
  if (week.length === 0) return [];

  const lastDayIndex = week[0].dayIndex - 1;
  return days.filter(
    (day) => day.dayIndex >= lastDayIndex - 6 && day.dayIndex <= lastDayIndex,
  );
}

/** The calendar month containing today — the Time Reclaimed hero's window (PRD §3.13). */
export function selectMonth(days: DayRange): DaySummary[] {
  const today = selectToday(days);
  if (today === null) return [];

  return days.filter((day) => sameMonth(day, today));
}

/** The calendar year containing today — partial in the user's first year. */
export function selectYear(days: DayRange): DaySummary[] {
  const today = selectToday(days);
  if (today === null) return [];

  return days.filter((day) => sameYear(day, today));
}

/** The record slice behind the Week / Month / Year trend control. */
export function selectPeriod(
  days: DayRange,
  period: AnalysisPeriod,
  { weekStartsOn = DEFAULT_WEEK_STARTS_ON }: { weekStartsOn?: Weekday } = {},
): DaySummary[] {
  switch (period) {
    case "week":
      return selectWeek(days, { weekStartsOn });
    case "month":
      return selectMonth(days);
    case "year":
      return selectYear(days);
  }
}

const ALL_DAYS_SCHEDULED_ACTIVE: StreakDayClassifier = () => ({
  kind: "scheduledActive",
  isActive: true,
});

/**
 * Current and longest runs of meaningful scheduled-active days. Scheduled rest
 * days are transparent: they preserve a run without adding a day to it. A gap
 * in the record still breaks a run because it represents days we never saw.
 */
export function selectStreak(
  days: DayRange,
  {
    classifyDay = ALL_DAYS_SCHEDULED_ACTIVE,
  }: { classifyDay?: StreakDayClassifier } = {},
): Streak {
  let current = 0;
  let longest = 0;

  days.forEach((day, index) => {
    const previous = index === 0 ? null : days[index - 1];
    const continues = previous !== null && previous.dayIndex === day.dayIndex - 1;

    if (!continues && previous !== null) {
      current = 0;
    }
    if (!classifyDay(day.dayIndex).isActive) {
      return;
    }

    current = day.meaningfulActivity ? (continues ? current : 0) + 1 : 0;
    longest = Math.max(longest, current);
  });

  return { current, longest };
}

export function selectTotals(days: DayRange): Totals {
  const totals = days.reduce(
    (sum, day) => ({
      earnedMinutes: sum.earnedMinutes + day.earnedMinutes,
      spentMinutes: sum.spentMinutes + day.spentMinutes,
      usageMinutes: sum.usageMinutes + day.usageMinutes,
      activeDays: sum.activeDays + (day.meaningfulActivity ? 1 : 0),
    }),
    { earnedMinutes: 0, spentMinutes: 0, usageMinutes: 0, activeDays: 0 },
  );

  return {
    ...totals,
    netMinutes: totals.earnedMinutes - totals.spentMinutes,
    dayCount: days.length,
  };
}

/** One earned/spent bar pair per day, pre-scaled so the view only lays out flex heights. */
export function selectBars(days: DayRange): Bar[] {
  const peak = days.reduce(
    (max, day) => Math.max(max, day.earnedMinutes, day.spentMinutes),
    0,
  );

  return days.map((day) => ({
    dayIndex: day.dayIndex,
    dayStartMs: day.dayStartMs,
    label: weekdayInitial(day),
    earnedMinutes: day.earnedMinutes,
    spentMinutes: day.spentMinutes,
    earnedFraction: peak === 0 ? 0 : day.earnedMinutes / peak,
    spentFraction: peak === 0 ? 0 : day.spentMinutes / peak,
    meaningfulActivity: day.meaningfulActivity,
  }));
}
