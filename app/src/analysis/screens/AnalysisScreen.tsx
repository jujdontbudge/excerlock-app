import { dayIndexFor, type DaySummary } from "@excerlock/ledger";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";

import { useHomeStore } from "@/home";
import { useConfessionStore } from "@/onboarding";
import {
  classifyScheduleDay,
  useScheduleStore,
  type ScheduleRules,
} from "@/schedule";
import { Screen, SectionHeader, useTheme } from "@/ui";
import type { ShareCardModule } from "@/shareCards";

import {
  AnalysisEmpty,
  ConditionBreakdownCard,
  DayLedger,
  EarnedSpentCard,
  PeriodControl,
  RecapCard,
  RequirementHeatMapCard,
  StreakCard,
  TimeReclaimedHero,
  WeekChart,
} from "../components";
import {
  buildAnalysisView,
  conditionNameMap,
  deriveDayRecord,
  type AnalysisPeriod,
  type Weekday,
} from "../model";
import type { AnalysisClock } from "../clock";
import { MilestonesShelf } from "../milestones/MilestonesShelf";
import {
  useMilestoneUnlockMoment,
  type MilestoneHaptics,
} from "../milestones/unlockMoment";

export type AnalysisScreenProps = {
  /**
   * Optional deterministic record override for tests and E2E fixtures.
   * Production derives this from Home's journal.
   */
  days?: readonly DaySummary[];
  /**
   * Explicit local-wall-clock cutoff passed to `daySummaries`. Without a
   * cutoff or injected clock, projection stops at the latest journal event.
   */
  throughMs?: number;
  /**
   * Time enters Analysis only through this edge dependency. Its value extends
   * the real ledger through quiet days and drives recap generation/freshness.
   */
  clock?: AnalysisClock;
  /** The *Start week on* setting (PRD §3.15 Tab 4). Monday until Settings owns it. */
  weekStartsOn?: Weekday;
  /** Current display names keyed by the condition ids persisted in the ledger. */
  conditionNames?: Readonly<Record<string, string>>;
  /**
   * The onboarding confession (#43). Left out, it comes from the confession
   * store — this module reads it and never writes it, because the baseline is a
   * fixed life-before-ExcerLock snapshot (PRD §3.13).
   */
  confessedDailyMinutes?: number | null;
  /** Deterministic schedule override for tests; production reads Schedule's store. */
  schedule?: ScheduleRules;
  /** Optional deterministic milestone capture/share boundary for render tests. */
  milestoneShareCardModule?: ShareCardModule;
  /** Native success feedback boundary; there is intentionally no sound edge. */
  milestoneHaptics?: MilestoneHaptics;
  /** Changes once for each focused Analysis visit. */
  milestoneUnlockVisitKey?: number | null;
};

/**
 * Analysis — the weekly recap, the Time Reclaimed hero, the selected period's
 * earned-versus-spent trend, the streak + requirement history, per-condition
 * earnings, milestone shelf and the day ledger under it.
 *
 * This file projects Home's real journal, joins current condition names and
 * lays out the view. All numerical reading after projection is done by
 * `buildAnalysisView`.
 */
export function AnalysisScreen({
  days,
  throughMs,
  clock,
  weekStartsOn,
  conditionNames,
  confessedDailyMinutes,
  schedule,
  milestoneHaptics,
  milestoneShareCardModule,
  milestoneUnlockVisitKey = 0,
}: AnalysisScreenProps) {
  const { spacing, typography } = useTheme();
  const [period, setPeriod] = useState<AnalysisPeriod>("week");
  const unlockSequence = useMilestoneUnlockMoment(
    milestoneUnlockVisitKey,
    milestoneHaptics,
  );
  const confessed = useConfessionStore((state) => state.confessedDailyMinutes);
  const conditions = useHomeStore((state) => state.conditions);
  const journal = useHomeStore((state) => state.journal);
  const ledgerConfig = useHomeStore((state) => state.ledgerConfig);
  const recurringRestWeekdays = useScheduleStore(
    (state) => state.recurringRestWeekdays,
  );
  const holidays = useScheduleStore((state) => state.holidays);
  const overrides = useScheduleStore((state) => state.overrides);
  const storedSchedule = useMemo<ScheduleRules>(
    () => ({ recurringRestWeekdays, holidays, overrides }),
    [holidays, overrides, recurringRestWeekdays],
  );
  const activeSchedule = schedule ?? storedSchedule;
  const nowMs = clock?.nowMs();
  const recordThroughMs = throughMs ?? nowMs;
  const realDays = useMemo(
    () => deriveDayRecord(journal, ledgerConfig, recordThroughMs),
    [journal, ledgerConfig, recordThroughMs],
  );
  const view = buildAnalysisView(days ?? realDays, {
    ...(nowMs === undefined ? {} : { nowMs }),
    ...(weekStartsOn === undefined ? {} : { weekStartsOn }),
    period,
    conditionNames: conditionNames ?? conditionNameMap(conditions),
    confessedDailyMinutes:
      confessedDailyMinutes === undefined ? confessed : confessedDailyMinutes,
    classifyDay: (dayIndex) =>
      classifyScheduleDay({ dayIndex, schedule: activeSchedule }),
    throughDayIndex:
      recordThroughMs === undefined
        ? undefined
        : dayIndexFor(
            recordThroughMs,
            ledgerConfig.dayBoundaryOffsetMinutes,
          ),
  });

  return (
    <Screen testID="analysis-screen">
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { gap: spacing.lg, padding: spacing.gutter, paddingBottom: spacing.xxl },
        ]}
      >
        <Text accessibilityRole="header" style={typography.screenTitle}>
          Analysis
        </Text>

        {view.isEmpty ? (
          <AnalysisEmpty />
        ) : (
          <>
            {view.recap === null ? null : <RecapCard recap={view.recap} />}

            <TimeReclaimedHero reclaimed={view.monthReclaimed} />

            <SectionHeader title="Earned vs spent" />
            <PeriodControl selected={view.period} onSelect={setPeriod} />
            <EarnedSpentCard
              totals={view.windowTotals}
              caption={view.periodCaption}
            />
            <WeekChart bars={view.bars} />

            <SectionHeader title="Streak" />
            <StreakCard streak={view.streak} totals={view.windowTotals} />
            <RequirementHeatMapCard heatMap={view.requirementHeatMap} />

            <SectionHeader title="Earning breakdown" />
            <ConditionBreakdownCard
              caption={view.periodCaption}
              items={view.conditionBreakdown}
            />
          </>
        )}

        <SectionHeader title="Milestones" />
        <MilestonesShelf
          metrics={view.milestoneMetrics}
          unlockSequence={unlockSequence}
          shareCardModule={milestoneShareCardModule}
        />

        {view.isEmpty ? null : (
          <>
            <SectionHeader title="Day ledger" />
            <DayLedger days={view.ledger} />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1 },
});
