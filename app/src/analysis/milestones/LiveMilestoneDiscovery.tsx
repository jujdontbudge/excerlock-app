import { useEffect, useMemo } from "react";

import { useHomeStore } from "@/home";
import { useConfessionStore } from "@/onboarding";
import {
  classifyScheduleDay,
  useScheduleStore,
  type ScheduleRules,
} from "@/schedule";

import {
  systemAnalysisClock,
  type AnalysisClock,
} from "../clock";
import { deriveDayRecord } from "../model";
import { MilestoneDiscovery } from "./MilestoneDiscovery";
import { selectMilestoneMetrics } from "./metrics";
import {
  reviewCoordinator as defaultReviewCoordinator,
  type ReviewCoordinatorContract,
} from "@/review";

type LiveMilestoneDiscoveryProps = Readonly<{
  clock?: AnalysisClock;
  reviewCoordinator?: Pick<ReviewCoordinatorContract, "onStreakMilestone">;
}>;

/**
 * Composition-root observer: reads the real stores while every calculation
 * stays in the existing pure selectors.
 */
export function LiveMilestoneDiscovery({
  clock = systemAnalysisClock,
  reviewCoordinator = defaultReviewCoordinator,
}: LiveMilestoneDiscoveryProps) {
  const confessedDailyMinutes = useConfessionStore(
    (state) => state.confessedDailyMinutes,
  );
  const journal = useHomeStore((state) => state.journal);
  const ledgerConfig = useHomeStore((state) => state.ledgerConfig);
  const recurringRestWeekdays = useScheduleStore(
    (state) => state.recurringRestWeekdays,
  );
  const holidays = useScheduleStore((state) => state.holidays);
  const overrides = useScheduleStore((state) => state.overrides);
  const schedule = useMemo<ScheduleRules>(
    () => ({ recurringRestWeekdays, holidays, overrides }),
    [holidays, overrides, recurringRestWeekdays],
  );
  const observedAtMs = clock.nowMs();
  const days = useMemo(
    () => deriveDayRecord(journal, ledgerConfig, observedAtMs),
    [journal, ledgerConfig, observedAtMs],
  );
  const metrics = useMemo(
    () =>
      selectMilestoneMetrics(days, confessedDailyMinutes, {
        classifyDay: (dayIndex) =>
          classifyScheduleDay({ dayIndex, schedule }),
      }),
    [confessedDailyMinutes, days, schedule],
  );
  useEffect(() => {
    if (metrics.currentStreakDays === 7 || metrics.currentStreakDays === 30) {
      void reviewCoordinator.onStreakMilestone(metrics.currentStreakDays, observedAtMs);
    }
  }, [metrics.currentStreakDays, observedAtMs, reviewCoordinator]);

  return (
    <MilestoneDiscovery
      metrics={metrics}
      unlockedAtMs={observedAtMs}
    />
  );
}
