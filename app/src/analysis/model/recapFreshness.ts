import { DAY_MS, MIN_MS } from "@excerlock/ledger";

import { weekOffset, type Weekday } from "./calendar";
import { buildRecap, type Recap } from "./recap";
import {
  DEFAULT_WEEK_STARTS_ON,
  type DayRange,
  type StreakDayClassifier,
} from "./selectors";

/** PRD §3.13: the recap is generated at 18:00 local wall-clock time. */
export const RECAP_MINUTE_OF_DAY = 18 * 60;

type FreshRecapOptions = {
  /** Local wall-clock milliseconds, injected by the module edge. */
  nowMs: number;
  confessedDailyMinutes: number | null;
  weekStartsOn?: Weekday;
  classifyDay?: StreakDayClassifier;
};

/**
 * The recap available at an explicit clock value.
 *
 * Time enters as data: this selector is pure and never reads an ambient clock.
 */
export function selectFreshRecap(
  days: DayRange,
  {
    nowMs,
    confessedDailyMinutes,
    weekStartsOn = DEFAULT_WEEK_STARTS_ON,
    classifyDay,
  }: FreshRecapOptions,
): Recap | null {
  const currentDayIndex = Math.floor(nowMs / DAY_MS);
  const minuteOfDay = Math.floor(
    (nowMs - currentDayIndex * DAY_MS) / MIN_MS,
  );

  if (
    weekOffset({ dayIndex: currentDayIndex }, weekStartsOn) !== 6 ||
    minuteOfDay < RECAP_MINUTE_OF_DAY
  ) {
    return null;
  }

  const recapDays = days.filter((day) => day.dayIndex <= currentDayIndex);
  if (recapDays.at(-1)?.dayIndex !== currentDayIndex) return null;

  return buildRecap(recapDays, {
    confessedDailyMinutes,
    weekStartsOn,
    ...(classifyDay === undefined ? {} : { classifyDay }),
  });
}
