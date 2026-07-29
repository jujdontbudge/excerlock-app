import type { DaySummary } from "@excerlock/ledger";
import { StyleSheet, Text, View } from "react-native";

import { Card, useTheme } from "@/ui";

import { dayLabel, formatMinutes } from "../model";

type DayLedgerProps = {
  /** Newest first — the order the list draws. */
  days: readonly DaySummary[];
};

/** One row per recorded day: what was earned, what was spent, what was left at midnight. */
export function DayLedger({ days }: DayLedgerProps) {
  const { spacing } = useTheme();

  return (
    <Card testID="day-ledger" style={{ gap: spacing.md }}>
      {days.map((day) => (
        <DayRow key={day.dayIndex} day={day} />
      ))}
    </Card>
  );
}

function DayRow({ day }: { day: DaySummary }) {
  const { colors, radius, spacing, typography } = useTheme();
  const quiet = !day.meaningfulActivity;

  return (
    <View testID={`analysis-day-row-${day.dayIndex}`} style={[styles.row, { gap: spacing.md }]}>
      <View
        style={[
          styles.marker,
          {
            backgroundColor: quiet ? colors.pillSecondary : colors.primary,
            borderRadius: radius.pill,
          },
        ]}
      />

      <View style={styles.label}>
        <Text style={typography.cardTitle}>{dayLabel(day)}</Text>
        <Text style={typography.body}>
          {quiet
            ? // Missed days are stated, never marked failed (PRD §3.15 Tab 3 block 4).
              "No activity"
            : `${day.meaningfulConditionCount} ${day.meaningfulConditionCount === 1 ? "activity" : "activities"}`}
        </Text>
      </View>

      <View style={styles.amounts}>
        <Text style={[typography.caption, { color: colors.success }]}>
          +{formatMinutes(day.earnedMinutes)}
        </Text>
        <Text style={[typography.caption, { color: colors.primary }]}>
          −{formatMinutes(day.spentMinutes)}
        </Text>
        <Text style={[typography.caption, { color: colors.textTertiary }]}>
          {formatMinutes(day.endBalance)} left
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  amounts: { alignItems: "flex-end" },
  label: { flex: 1 },
  marker: { height: 10, marginTop: 5, width: 10 },
  row: { flexDirection: "row" },
});
