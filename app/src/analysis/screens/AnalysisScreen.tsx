import {
  dayIndexFor,
  type DaySummary,
} from "@excerlock/ledger";
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

type AnalysisScreenProps = {
  /**
   * Optional deterministic record override for tests and E2E fixtures.
   * Production derives this from Home's journal.
   */
  days?: readonly DaySummary[];
  /**
   * Local-wall-clock cutoff passed to `daySummaries`. Analysis never reads a
   * clock. Without this prop, it stops at the latest journal event.
   */
  throughMs?: number;
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
};

/**
 * Analysis — the weekly recap, the Time Reclaimed hero, the selected period's
 * earned-versus-spent trend, the streak, per-condition earnings and the day
 * ledger under it. The PRD's remaining heat map and milestones shelf still need
 * schedule/chronology inputs and badge art.
 *
 * This file projects Home's real journal, joins current condition names and
 * lays out the view. All numerical reading after projection is done by
 * `buildAnalysisView`.
 */
export function AnalysisScreen({
  days,
  throughMs,
  weekStartsOn,
  conditionNames,
  confessedDailyMinutes,
  schedule,
}: AnalysisScreenProps) {
  const { spacing, typography } = useTheme();
  const [period, setPeriod] = useState<AnalysisPeriod>("week");
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
  const realDays = useMemo(
    () => deriveDayRecord(journal, ledgerConfig, throughMs),
    [journal, ledgerConfig, throughMs],
  );
  const view = buildAnalysisView(days ?? realDays, {
    ...(weekStartsOn === undefined ? {} : { weekStartsOn }),
    period,
    conditionNames: conditionNames ?? conditionNameMap(conditions),
    confessedDailyMinutes:
      confessedDailyMinutes === undefined ? confessed : confessedDailyMinutes,
    classifyRequirementDay: (dayIndex) =>
      classifyScheduleDay({ dayIndex, schedule: activeSchedule }),
    throughDayIndex:
      throughMs === undefined
        ? undefined
        : dayIndexFor(
            throughMs,
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
