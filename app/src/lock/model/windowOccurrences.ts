import type { LockWindow } from "@/screentime";

import {
  weekdayForWallClock,
  type RecurringLockWindow,
} from "./recurringLockWindow";

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;
export const RECURRING_WINDOW_ID_PREFIX = "recurring:";

/**
 * Turns the persisted weekly rules into the concrete local-wall-clock
 * intervals ScreenTime accepts. Yesterday is considered so an overnight
 * interval that is active now is registered too.
 */
export function materializeLockWindows(
  definitions: readonly RecurringLockWindow[],
  atMs: number,
  horizonDays = 14,
): readonly LockWindow[] {
  const todayStart = Math.floor(atMs / DAY_MS) * DAY_MS;
  const throughMs = todayStart + horizonDays * DAY_MS;
  const occurrences: LockWindow[] = [];

  for (
    let dayStart = todayStart - DAY_MS;
    dayStart <= throughMs;
    dayStart += DAY_MS
  ) {
    const weekday = weekdayForWallClock(dayStart);
    definitions.forEach((definition) => {
      if (!definition.days.includes(weekday)) {
        return;
      }
      const startsAtMs = dayStart + definition.startMinute * MINUTE_MS;
      const endsAtMs =
        definition.endMinute > definition.startMinute
          ? dayStart + definition.endMinute * MINUTE_MS
          : dayStart + DAY_MS + definition.endMinute * MINUTE_MS;
      if (endsAtMs <= atMs || startsAtMs > throughMs) {
        return;
      }
      occurrences.push(
        Object.freeze({
          id: `${RECURRING_WINDOW_ID_PREFIX}${definition.id}:${startsAtMs}`,
          startsAtMs,
          endsAtMs,
        }),
      );
    });
  }

  return Object.freeze(
    occurrences.sort(
      (left, right) =>
        left.startsAtMs - right.startsAtMs || left.id.localeCompare(right.id),
    ),
  );
}

export function isRecurringLockWindowActive(
  definitions: readonly RecurringLockWindow[],
  atMs: number,
): boolean {
  return materializeLockWindows(definitions, atMs, 1).some(
    ({ startsAtMs, endsAtMs }) => atMs >= startsAtMs && atMs < endsAtMs,
  );
}
