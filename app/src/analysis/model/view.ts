import type { DaySummary } from "@excerlock/ledger";

import type { MilestoneMetrics } from "../milestones/progress";
import type { Weekday } from "./calendar";
import {
  selectConditionBreakdown,
  type ConditionBreakdownItem,
} from "./conditionBreakdown";
import type { Recap } from "./recap";
import { selectFreshRecap } from "./recapFreshness";
import {
  buildRequirementHeatMap,
  type RequirementDayClassifier,
  type RequirementHeatMap,
} from "./requirementHeatMap";
import {
  DEFAULT_WEEK_STARTS_ON,
  selectActivityCount,
  selectBars,
  selectMonth,
  selectPeriod,
  selectStreak,
  selectToday,
  selectTotals,
  type AnalysisPeriod,
  type Bar,
  type DayRange,
  type Streak,
  type Totals,
} from "./selectors";
import { selectTimeReclaimed, type TimeReclaimed } from "./timeReclaimed";

/**
 * The one read the Analysis screen performs. The screen asks for a view and
 * lays it out; it never slices, sums or sorts. Home's journal is projected into
 * this input before the view is built; deterministic tests may inject the same
 * `DaySummary` shape directly.
 */
export type AnalysisView = {
  /** True before the first day is recorded — the day-zero user (PRD §8 Conditions). */
  isEmpty: boolean;
  today: DaySummary | null;
  period: AnalysisPeriod;
  periodCaption: string;
  /** The selected calendar window containing today, ascending. */
  window: DaySummary[];
  windowTotals: Totals;
  allTimeTotals: Totals;
  streak: Streak;
  /** One bar pair per day of the selected window, ascending. */
  bars: Bar[];
  /** Banked minutes per condition over the selected window, highest first. */
  conditionBreakdown: ConditionBreakdownItem[];
  /** The selected window's days, newest first. */
  ledger: DaySummary[];
  /** The hero's window: Time Reclaimed over the calendar month (PRD §3.13). */
  monthReclaimed: TimeReclaimed;
  /** The newest generated recap while fresh; otherwise `null`. */
  recap: Recap | null;
  /** Whole-week columns for the requirement history, including honest padding. */
  requirementHeatMap: RequirementHeatMap;
  /** All-record inputs for the three milestone ladders. */
  milestoneMetrics: MilestoneMetrics;
};

type AnalysisViewOptions = {
  /**
   * Local wall-clock milliseconds supplied by the module edge. Without an
   * explicit instant there is no honest freshness verdict, so no recap.
   */
  nowMs?: number;
  weekStartsOn?: Weekday;
  period?: AnalysisPeriod;
  /**
   * `confessed_daily_minutes` from onboarding (#43) — the fixed
   * life-before-ExcerLock baseline. `null` when onboarding was skipped, which is
   * a first-class state, not a missing value to paper over.
   */
  confessedDailyMinutes?: number | null;
  /** Current condition names keyed by the immutable ids stored in day summaries. */
  conditionNames?: Readonly<Record<string, string>>;
  /** Schedule's one precedence law, injected so this pure view owns no store. */
  classifyDay?: RequirementDayClassifier;
  /** The caller's explicit current ledger day when it extends past the record. */
  throughDayIndex?: number;
};

export function buildAnalysisView(
  days: DayRange,
  {
    nowMs,
    weekStartsOn = DEFAULT_WEEK_STARTS_ON,
    period = "week",
    confessedDailyMinutes = null,
    conditionNames = {},
    classifyDay,
    throughDayIndex,
  }: AnalysisViewOptions = {},
): AnalysisView {
  const window = selectPeriod(days, period, { weekStartsOn });
  const streak = selectStreak(days, {
    ...(classifyDay === undefined ? {} : { classifyDay }),
  });
  const allTimeReclaimed = selectTimeReclaimed(
    days,
    confessedDailyMinutes,
  );

  return {
    isEmpty: days.length === 0,
    today: selectToday(days),
    period,
    periodCaption: periodCaption(period),
    window,
    windowTotals: selectTotals(window),
    allTimeTotals: selectTotals(days),
    streak,
    bars: selectBars(window),
    conditionBreakdown: selectConditionBreakdown(window, conditionNames),
    ledger: [...window].reverse(),
    monthReclaimed: selectTimeReclaimed(selectMonth(days), confessedDailyMinutes),
    recap:
      nowMs === undefined
        ? null
        : selectFreshRecap(days, {
            nowMs,
            confessedDailyMinutes,
            weekStartsOn,
            conditionNames,
            ...(classifyDay === undefined ? {} : { classifyDay }),
          }),
    requirementHeatMap: buildRequirementHeatMap(days, {
      weekStartsOn,
      ...(classifyDay === undefined
        ? {}
        : { classifyDay }),
      ...(throughDayIndex === undefined ? {} : { throughDayIndex }),
      conditionNames,
    }),
    milestoneMetrics: {
      currentStreakDays: streak.current,
      longestStreakDays: streak.longest,
      activityCount: selectActivityCount(days),
      timeReclaimedMinutes: allTimeReclaimed.reclaimedMinutes,
    },
  };
}

function periodCaption(period: AnalysisPeriod): string {
  switch (period) {
    case "week":
      return "This week";
    case "month":
      return "This month";
    case "year":
      return "This year";
  }
}
