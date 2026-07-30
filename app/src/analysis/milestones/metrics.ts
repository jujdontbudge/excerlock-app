import type { DaySummary } from "@excerlock/ledger";

import {
  selectActivityCount,
  selectStreak,
} from "../model/selectors";
import { selectTimeReclaimed } from "../model/timeReclaimed";
import type { RequirementDayClassifier } from "../model/requirementHeatMap";
import type { MilestoneMetrics } from "./progress";

type MilestoneMetricOptions = Readonly<{
  classifyDay?: RequirementDayClassifier;
}>;

/** Composes the existing all-record selectors into the shelf's small input. */
export function selectMilestoneMetrics(
  days: readonly DaySummary[],
  confessedDailyMinutes: number | null,
  { classifyDay }: MilestoneMetricOptions = {},
): MilestoneMetrics {
  const streak = selectStreak(days, {
    ...(classifyDay === undefined ? {} : { classifyDay }),
  });
  const reclaimed = selectTimeReclaimed(
    days,
    confessedDailyMinutes,
  );

  return {
    currentStreakDays: streak.current,
    longestStreakDays: streak.longest,
    activityCount: selectActivityCount(days),
    timeReclaimedMinutes: reclaimed.reclaimedMinutes,
  };
}
