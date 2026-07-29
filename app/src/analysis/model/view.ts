import type { DaySummary } from "@excerlock/ledger";

import type { Weekday } from "./calendar";
import {
  DEFAULT_WEEK_STARTS_ON,
  selectBars,
  selectStreak,
  selectToday,
  selectTotals,
  selectWeek,
  type Bar,
  type DayRange,
  type Streak,
  type Totals,
} from "./selectors";

/**
 * The one read the Analysis screen performs. The screen asks for a view and
 * lays it out; it never slices, sums or sorts. Swapping the fixture for the real
 * `ledgerStore` therefore changes one prop and nothing else.
 */
export type AnalysisView = {
  /** True before the first day is recorded — the day-zero user (PRD §8 Conditions). */
  isEmpty: boolean;
  today: DaySummary | null;
  /** The calendar week containing today, ascending. */
  week: DaySummary[];
  weekTotals: Totals;
  allTimeTotals: Totals;
  streak: Streak;
  /** One bar pair per day of the week, ascending — the chart's whole input. */
  bars: Bar[];
  /** The same week's days, newest first — the ledger list's whole input. */
  ledger: DaySummary[];
};

export function buildAnalysisView(
  days: DayRange,
  { weekStartsOn = DEFAULT_WEEK_STARTS_ON }: { weekStartsOn?: Weekday } = {},
): AnalysisView {
  const week = selectWeek(days, { weekStartsOn });

  return {
    isEmpty: days.length === 0,
    today: selectToday(days),
    week,
    weekTotals: selectTotals(week),
    allTimeTotals: selectTotals(days),
    streak: selectStreak(days),
    bars: selectBars(week),
    ledger: [...week].reverse(),
  };
}
