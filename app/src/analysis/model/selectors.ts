import type { DaySummary } from "@excerlock/ledger";

import { weekdayInitial, weekOffset, type Weekday } from "./calendar";

/**
 * Pure reads over an ascending, contiguous run of `DaySummary` records. Every
 * function is total: an empty ledger is a first-class input, never a crash.
 * Nothing here recomputes ledger math — the summaries already carry it.
 */

export const DEFAULT_WEEK_STARTS_ON: Weekday = 1; // Monday.

export type DayRange = readonly DaySummary[];

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
  /** The run of meaningful days ending on the last day on record. */
  current: number;
  longest: number;
};

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
 * Current and longest runs of meaningful days. A gap in the record breaks a run:
 * summaries are contiguous by construction, so a jump means days we never saw.
 *
 * This is the naive streak — rest-day transparency and the sick-day override need
 * schedule knowledge, which lives above the ledger (packages/ledger README).
 */
export function selectStreak(days: DayRange): Streak {
  let current = 0;
  let longest = 0;

  days.forEach((day, index) => {
    const previous = index === 0 ? null : days[index - 1];
    const continues = previous !== null && previous.dayIndex === day.dayIndex - 1;
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
