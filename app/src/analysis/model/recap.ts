import { dayRangeLabel, type Weekday } from "./calendar";
import {
  DEFAULT_WEEK_STARTS_ON,
  selectPreviousWeek,
  selectStreak,
  selectTotals,
  selectWeek,
  type DayRange,
  type Streak,
  type StreakDayClassifier,
} from "./selectors";
import { selectTimeReclaimed, type TimeReclaimed } from "./timeReclaimed";

/**
 * The weekly recap (PRD §3.13, contents decided 2026-07-28) — the five rows the
 * card renders, computed once:
 *
 * ① the week's Time Reclaimed, with a delta against last week · ② active days ·
 * ③ activity count · ④ earned versus spent · ⑤ the streak as the week closes.
 *
 * Two pieces of the PRD row set are not here because their inputs are not:
 * row ②'s denominator should be the week's *scheduled* active days (schedule
 * store) and row ③'s "most from Gym visits" needs condition names (condition
 * store). Both are named in the module README rather than faked.
 */
export type Recap = {
  /** "20–26 Jul" — the week this recap covers. */
  rangeLabel: string;
  /** ① */
  reclaimed: TimeReclaimed;
  /**
   * ① Minutes reclaimed this week against last week's. `null` when no earlier
   * week is on record — a first week has nothing to compare against, and there
   * is no confession-free delta either.
   */
  deltaMinutes: number | null;
  /** ② Days that met the meaningful-activity bar, against the days on record. */
  activeDays: number;
  dayCount: number;
  /** ③ One activity = one condition-day that met the bar (PRD §3.13). */
  activityCount: number;
  /** ④ */
  earnedMinutes: number;
  spentMinutes: number;
  /** ⑤ */
  streak: Streak;
};

type RecapOptions = {
  /** `confessed_daily_minutes` from onboarding; `null` when it was skipped. */
  confessedDailyMinutes: number | null;
  weekStartsOn?: Weekday;
  /** Schedule's precedence result for each ledger day. */
  classifyDay?: StreakDayClassifier;
};

const ALL_DAYS_SCHEDULED_ACTIVE: StreakDayClassifier = () => ({
  kind: "scheduledActive",
  isActive: true,
});

/** The recap for the week containing today. `null` before anything is recorded. */
export function buildRecap(
  days: DayRange,
  {
    confessedDailyMinutes,
    weekStartsOn = DEFAULT_WEEK_STARTS_ON,
    classifyDay = ALL_DAYS_SCHEDULED_ACTIVE,
  }: RecapOptions,
): Recap | null {
  const week = selectWeek(days, { weekStartsOn });
  if (week.length === 0) return null;

  const previousWeek = selectPreviousWeek(days, { weekStartsOn });
  const scheduledActiveWeek = week.filter((day) =>
    classifyDay(day.dayIndex).isActive,
  );
  const reclaimed = selectTimeReclaimed(week, confessedDailyMinutes);
  const previousReclaimed = selectTimeReclaimed(previousWeek, confessedDailyMinutes);
  const totals = selectTotals(week);

  return {
    rangeLabel: dayRangeLabel(week[0], week.at(-1)!),
    reclaimed,
    deltaMinutes:
      previousWeek.length === 0 || reclaimed.status !== "measured"
        ? null
        : reclaimed.reclaimedMinutes - previousReclaimed.reclaimedMinutes,
    activeDays: scheduledActiveWeek.filter((day) => day.meaningfulActivity).length,
    dayCount: scheduledActiveWeek.length,
    activityCount: week.reduce((sum, day) => sum + day.meaningfulConditionCount, 0),
    earnedMinutes: totals.earnedMinutes,
    spentMinutes: totals.spentMinutes,
    streak: selectStreak(days, { classifyDay }),
  };
}
