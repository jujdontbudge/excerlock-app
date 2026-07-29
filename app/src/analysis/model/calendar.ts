import type { DaySummary } from "@excerlock/ledger";

/**
 * Weekday arithmetic over the ledger's `dayIndex`.
 *
 * A ledger day index is an epoch day shifted by the user's day boundary, so day
 * 0 is 1 January 1970 — a Thursday. That makes the weekday pure arithmetic: no
 * `Date`, no timezone, no clock. Everything here is total and side-effect free.
 */

/** `0` is Sunday, matching `Date#getDay` and the *Start week on* setting (PRD §3.15 Tab 4). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const EPOCH_DAY_WEEKDAY = 4; // 1970-01-01 was a Thursday.

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

export function weekdayIndex(day: Pick<DaySummary, "dayIndex">): Weekday {
  return ((((day.dayIndex + EPOCH_DAY_WEEKDAY) % 7) + 7) % 7) as Weekday;
}

/** "M" · "T" · "W" — the bar-chart axis. Deliberately ambiguous; the row list carries the full label. */
export function weekdayInitial(day: Pick<DaySummary, "dayIndex">): string {
  return WEEKDAY_NAMES[weekdayIndex(day)].charAt(0);
}

/** "Mon 6 Jul" — the day-row label. */
export function dayLabel(day: Pick<DaySummary, "dayIndex" | "dayStartMs">): string {
  // Ledger timestamps are local wall-clock milliseconds, so the UTC getters read
  // back exactly the wall-clock date the ledger recorded (packages/ledger README).
  const at = new Date(day.dayStartMs);
  return `${WEEKDAY_NAMES[weekdayIndex(day)]} ${at.getUTCDate()} ${MONTH_NAMES[at.getUTCMonth()]}`;
}

/**
 * How many days into its week this day sits, given which weekday starts the week.
 * `weekStartsOn` is the *Start week on* setting; it defaults to Monday.
 */
export function weekOffset(day: Pick<DaySummary, "dayIndex">, weekStartsOn: Weekday): number {
  return (weekdayIndex(day) - weekStartsOn + 7) % 7;
}
