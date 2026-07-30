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
/** PRD §3.13: the generated recap stays atop Analysis for 72 hours. */
export const RECAP_FRESHNESS_MS = 72 * 60 * MIN_MS;

type FreshRecapOptions = {
  /** Local wall-clock milliseconds, injected by the module edge. */
  nowMs: number;
  confessedDailyMinutes: number | null;
  weekStartsOn?: Weekday;
  classifyDay?: StreakDayClassifier;
  conditionNames?: Readonly<Record<string, string>>;
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
    conditionNames = {},
  }: FreshRecapOptions,
): Recap | null {
  const currentDayIndex = Math.floor(nowMs / DAY_MS);
  const offset = weekOffset({ dayIndex: currentDayIndex }, weekStartsOn);
  const currentWeekEndDayIndex = currentDayIndex + (6 - offset);
  const currentWeekMomentMs =
    currentWeekEndDayIndex * DAY_MS + RECAP_MINUTE_OF_DAY * MIN_MS;
  const recapDayIndex =
    nowMs >= currentWeekMomentMs
      ? currentWeekEndDayIndex
      : currentWeekEndDayIndex - 7;
  const generatedAtMs =
    recapDayIndex * DAY_MS + RECAP_MINUTE_OF_DAY * MIN_MS;

  if (nowMs >= generatedAtMs + RECAP_FRESHNESS_MS) return null;

  const recapDays = days.filter((day) => day.dayIndex <= recapDayIndex);
  if (recapDays.at(-1)?.dayIndex !== recapDayIndex) return null;

  return buildRecap(recapDays, {
    confessedDailyMinutes,
    weekStartsOn,
    conditionNames,
    ...(classifyDay === undefined ? {} : { classifyDay }),
  });
}
