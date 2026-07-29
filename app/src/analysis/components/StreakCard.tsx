import { StyleSheet, Text, View } from "react-native";

import { Card, useTheme } from "@/ui";

import { formatDayCount, type Streak, type Totals } from "../model";

type StreakCardProps = {
  streak: Streak;
  /** The window whose active-day count sits under the streak. */
  totals: Totals;
};

/**
 * Current streak against the personal best, with the window's active days under
 * it. Rest-day transparency needs the schedule (packages/ledger README), so the
 * denominator here is days on record, not scheduled days — the recap's "5 of 6"
 * arrives with the schedule store.
 */
export function StreakCard({ streak, totals }: StreakCardProps) {
  const { colors, spacing, typography } = useTheme();

  return (
    <Card testID="streak-card">
      <View style={styles.row}>
        <Reading
          testID="streak-current"
          value={streak.current}
          label={streak.current === 1 ? "day streak" : "days in a row"}
          tint={colors.primary}
        />
        <Reading testID="streak-longest" value={streak.longest} label="best ever" />
      </View>

      <Text testID="streak-active-days" style={[typography.body, { marginTop: spacing.md }]}>
        {formatDayCount(totals.activeDays, totals.dayCount)} with a qualifying activity.
      </Text>
    </Card>
  );
}

function Reading({
  testID,
  value,
  label,
  tint,
}: {
  testID: string;
  value: number;
  label: string;
  tint?: string;
}) {
  const { spacing, typography } = useTheme();

  return (
    <View style={[styles.reading, { gap: spacing.xs }]}>
      <Text
        testID={testID}
        style={[typography.hero, styles.readingValue, tint === undefined ? null : { color: tint }]}
      >
        {value}
      </Text>
      <Text style={typography.caption}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  reading: { flex: 1 },
  readingValue: { fontSize: 48, lineHeight: 54 },
  row: { alignItems: "flex-end", flexDirection: "row" },
});
