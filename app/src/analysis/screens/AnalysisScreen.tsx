import type { DaySummary } from "@excerlock/ledger";
import { ScrollView, StyleSheet, Text } from "react-native";

import { useHomeStore } from "@/home";
import { useConfessionStore } from "@/onboarding";
import { Screen, SectionHeader, useTheme } from "@/ui";

import {
  AnalysisEmpty,
  ConditionBreakdownCard,
  DayLedger,
  EarnedSpentCard,
  RecapCard,
  StreakCard,
  TimeReclaimedHero,
  WeekChart,
} from "../components";
import {
  FIXTURE_CONDITION_NAMES,
  FIXTURE_DAY_SUMMARIES,
} from "../fixtures";
import {
  buildAnalysisView,
  conditionNameMap,
  type Weekday,
} from "../model";

type AnalysisScreenProps = {
  /**
   * The day record, ascending. Defaults to the Phase 2 fixture; the real
   * `ledgerStore` feed replaces this prop and nothing else (ARCHITECTURE §6).
   */
  days?: readonly DaySummary[];
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
  weekStartsOn,
  conditionNames,
  confessedDailyMinutes,
}: AnalysisScreenProps) {
  const { spacing, typography } = useTheme();
  const confessed = useConfessionStore((state) => state.confessedDailyMinutes);
  const conditions = useHomeStore((state) => state.conditions);
  const view = buildAnalysisView(days ?? FIXTURE_DAY_SUMMARIES, {
    ...(weekStartsOn === undefined ? {} : { weekStartsOn }),
    conditionNames:
      conditionNames ??
      (days === undefined
        ? FIXTURE_CONDITION_NAMES
        : conditionNameMap(conditions)),
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

            <EarnedSpentCard totals={view.weekTotals} caption="This week" />

            <SectionHeader title="Earned vs spent" />
            <WeekChart bars={view.bars} />

            <SectionHeader title="Streak" />
            <StreakCard streak={view.streak} totals={view.weekTotals} />

            <SectionHeader title="Earning breakdown" />
            <ConditionBreakdownCard
              caption="This week"
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
