import type { DaySummary } from "@excerlock/ledger";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";

import { useHomeStore } from "@/home";
import { useConfessionStore } from "@/onboarding";
import { Screen, SectionHeader, useTheme } from "@/ui";

import {
  AnalysisEmpty,
  ConditionBreakdownCard,
  DayLedger,
  EarnedSpentCard,
  PeriodControl,
  RecapCard,
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
};

/**
 * Analysis — the weekly recap, the Time Reclaimed hero, this week's
 * earned-versus-spent balance, the streak, per-condition earnings and the day ledger under it. The
 * PRD's remaining blocks (the Week/Month/Year control, the requirement heat map,
 * and the milestones shelf) need the real feed, schedule/chronology inputs and
 * the badge art; they land on top of this.
 *
 * All numerical reading is done by `buildAnalysisView`; this file joins current
 * store-backed condition names and lays the result out.
 */
export function AnalysisScreen({
  days,
  throughMs,
  weekStartsOn,
  conditionNames,
  confessedDailyMinutes,
}: AnalysisScreenProps) {
  const { spacing, typography } = useTheme();
  const [period, setPeriod] = useState<AnalysisPeriod>("week");
  const confessed = useConfessionStore((state) => state.confessedDailyMinutes);
  const conditions = useHomeStore((state) => state.conditions);
  const journal = useHomeStore((state) => state.journal);
  const ledgerConfig = useHomeStore((state) => state.ledgerConfig);
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
