import type { DeliveryRecord } from "../NotificationModule";

/**
 * PRD §3.14's delivery rules, as arithmetic.
 *
 * Nothing here reads a clock. Every function takes the moment it should judge,
 * which is what makes the planner deterministic under an injected clock.
 */

export const QUIET_HOURS_START_MINUTE = 22 * 60;
export const QUIET_HOURS_END_MINUTE = 7 * 60;

/** "max 1 engagement push per day, target 0" — the streak last call is the stated exception. */
export const MAX_ENGAGEMENT_PUSHES_PER_DAY = 1;

/** "≤5 pushes in any rolling 7-day window" — no type is exempt from this one. */
export const MAX_PUSHES_PER_ROLLING_WEEK = 5;

export const ROLLING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const MINUTE_MS = 60 * 1000;
const DAY_MINUTES = 24 * 60;

/**
 * Minutes since local midnight.
 *
 * The argument is local wall-clock milliseconds (`packages/ledger`'s convention),
 * so plain modulo arithmetic reads back the wall clock the user sees — no `Date`,
 * no timezone lookup, no drift across a DST boundary.
 */
export function minuteOfDay(wallClockMs: number): number {
  const minutes = Math.floor(wallClockMs / MINUTE_MS);
  return ((minutes % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
}

/**
 * Quiet hours wrap midnight, so this is a union rather than a range: silent from
 * 22:00 inclusive, delivering again from 07:00 inclusive.
 */
export function isWithinQuietHours(minute: number): boolean {
  return minute >= QUIET_HOURS_START_MINUTE || minute < QUIET_HOURS_END_MINUTE;
}

/** Deliveries strictly inside the trailing seven days — a delivery ages out exactly at 7d. */
export function countInRollingWindow(
  deliveries: readonly DeliveryRecord[],
  atMs: number,
): number {
  const windowStartMs = atMs - ROLLING_WINDOW_MS;
  return deliveries.filter((record) => record.deliveredAtMs > windowStartMs).length;
}

export function hasRollingWeekHeadroom(
  deliveries: readonly DeliveryRecord[],
  atMs: number,
): boolean {
  return countInRollingWindow(deliveries, atMs) < MAX_PUSHES_PER_ROLLING_WEEK;
}
