import type { DaySummary } from "@excerlock/ledger";
import { ScrollView, StyleSheet, Text } from "react-native";

import { Screen, SectionHeader, useTheme } from "@/ui";

import {
  AnalysisEmpty,
  DayLedger,
  EarnedSpentCard,
  StreakCard,
  WeekChart,
} from "../components";
import { FIXTURE_DAY_SUMMARIES } from "../fixtures";
import { buildAnalysisView, type Weekday } from "../model";

type AnalysisScreenProps = {
  /**
   * The day record, ascending. Defaults to the Phase 2 fixture; the real
   * `ledgerStore` feed replaces this prop and nothing else (ARCHITECTURE §6).
   */
  days?: readonly DaySummary[];
  /** The *Start week on* setting (PRD §3.15 Tab 4). Monday until Settings owns it. */
  weekStartsOn?: Weekday;
};

/**
 * Analysis — this week's earned-versus-spent balance, the streak, and the day
 * ledger under it. The PRD's remaining blocks (weekly recap, Time Reclaimed
 * hero, the requirement heat map, per-condition breakdown, milestones shelf)
 * need the store, the schedule and the badge art; they land on top of this.
 *
 * All reading is done by `buildAnalysisView` — this file only lays out.
 */
export function AnalysisScreen({
  days = FIXTURE_DAY_SUMMARIES,
  weekStartsOn,
}: AnalysisScreenProps) {
  const { spacing, typography } = useTheme();
  const view = buildAnalysisView(days, weekStartsOn === undefined ? {} : { weekStartsOn });

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
            <EarnedSpentCard totals={view.weekTotals} caption="This week" />

            <SectionHeader title="Earned vs spent" />
            <WeekChart bars={view.bars} />

            <SectionHeader title="Streak" />
            <StreakCard streak={view.streak} totals={view.weekTotals} />

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
