import { StyleSheet, Text, View } from "react-native";

import { Card, useTheme } from "@/ui";

import { formatMinutes, formatSignedMinutes, type Totals } from "../model";

type EarnedSpentCardProps = {
  totals: Totals;
  /** What window these totals cover, e.g. "This week". */
  caption: string;
};

/**
 * The window's headline: minutes banked against minutes burned, and the
 * difference between them. A negative difference is stated plainly and never
 * coloured as failure — the balance also comes from the daily allowance, so
 * spending more than you earned is normal, not a verdict (PRD sells-not-scolds).
 */
export function EarnedSpentCard({ totals, caption }: EarnedSpentCardProps) {
  const { colors, spacing, typography } = useTheme();
  const banked = totals.netMinutes >= 0;

  return (
    <Card testID="earned-spent-card">
      <Text style={typography.caption}>{caption}</Text>

      <View style={[styles.row, { marginTop: spacing.md }]}>
        <Figure
          testID="earned-total"
          label="Earned"
          value={formatMinutes(totals.earnedMinutes)}
          tint={colors.success}
        />
        <Figure
          testID="spent-total"
          label="Spent"
          value={formatMinutes(totals.spentMinutes)}
          tint={colors.primary}
        />
      </View>

      <Text style={[typography.body, { marginTop: spacing.md, color: colors.textSecondary }]}>
        <Text testID="net-total" style={styles.emphasis}>
          {formatSignedMinutes(totals.netMinutes)}
        </Text>
        {banked ? " banked over the window" : " drawn from your daily allowance"}
      </Text>
    </Card>
  );
}

function Figure({
  testID,
  label,
  value,
  tint,
}: {
  testID: string;
  label: string;
  value: string;
  tint: string;
}) {
  const { radius, spacing, typography } = useTheme();

  return (
    <View style={[styles.figure, { gap: spacing.xs }]}>
      <View style={[styles.legend, { gap: spacing.sm }]}>
        <View style={[styles.swatch, { backgroundColor: tint, borderRadius: radius.pill }]} />
        <Text style={typography.caption}>{label}</Text>
      </View>
      <Text testID={testID} style={typography.numeric}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  emphasis: { fontWeight: "600" },
  figure: { flex: 1 },
  legend: { alignItems: "center", flexDirection: "row" },
  row: { flexDirection: "row" },
  swatch: { height: 6, width: 6 },
});
