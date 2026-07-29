import { StyleSheet, Text, View } from "react-native";

import { Card, useTheme } from "@/ui";

import { dayLabel, formatMinutes, type Bar } from "../model";

/** Tallest a bar may draw. Fractions from `selectBars` scale against this. */
const TRACK_HEIGHT = 104;
/** A day with minutes still shows a sliver, so "a little" never reads as "nothing". */
const MINIMUM_INK = 3;

type WeekChartProps = {
  bars: readonly Bar[];
};

/**
 * Earned against spent, one pair of fat rounded bars per day (PRD §3.15 Tab 3
 * block 3). Built from plain Views on purpose: a week of two-bar columns is
 * layout, not a charting problem, and no chart library enters the app for it.
 * The segmented Week/Month/Year control arrives with the real store.
 */
export function WeekChart({ bars }: WeekChartProps) {
  const { colors, spacing, typography } = useTheme();

  return (
    <Card testID="week-chart">
      <View style={[styles.plot, { height: TRACK_HEIGHT, gap: spacing.xs }]}>
        {bars.map((bar) => (
          <Column key={bar.dayIndex} bar={bar} />
        ))}
      </View>
      <View style={[styles.axis, { marginTop: spacing.sm, gap: spacing.xs }]}>
        {bars.map((bar) => (
          <Text
            key={bar.dayIndex}
            style={[
              typography.caption,
              styles.tick,
              { color: bar.meaningfulActivity ? colors.textPrimary : colors.textTertiary },
            ]}
          >
            {bar.label}
          </Text>
        ))}
      </View>
    </Card>
  );
}

function Column({ bar }: { bar: Bar }) {
  const { colors } = useTheme();

  return (
    <View
      testID={`analysis-bar-${bar.dayIndex}`}
      accessibilityLabel={`${dayLabel(bar)} — earned ${formatMinutes(bar.earnedMinutes)}, spent ${formatMinutes(bar.spentMinutes)}`}
      style={[styles.column, { gap: 3 }]}
    >
      <Ink fraction={bar.earnedFraction} minutes={bar.earnedMinutes} color={colors.success} />
      <Ink fraction={bar.spentFraction} minutes={bar.spentMinutes} color={colors.primary} />
    </View>
  );
}

function Ink({ fraction, minutes, color }: { fraction: number; minutes: number; color: string }) {
  const { radius } = useTheme();
  const height = minutes === 0 ? 0 : Math.max(MINIMUM_INK, fraction * TRACK_HEIGHT);

  return (
    <View style={[styles.ink, { backgroundColor: color, borderRadius: radius.pill, height }]} />
  );
}

const styles = StyleSheet.create({
  axis: { flexDirection: "row" },
  column: { alignItems: "flex-end", flex: 1, flexDirection: "row", height: "100%" },
  ink: { flex: 1 },
  plot: { alignItems: "flex-end", flexDirection: "row" },
  tick: { flex: 1, textAlign: "center" },
});
