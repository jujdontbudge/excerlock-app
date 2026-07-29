import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/ui";

import type { LockHeroModel } from "../model/lockState";

/** The balance stats row under the hero — what today earned and what it spent. */
export function StatsRow({ model }: { model: LockHeroModel }) {
  const { spacing } = useTheme();

  return (
    <View testID="home-stats-row" style={[styles.row, { gap: spacing.gutter }]}>
      <Stat label="Earned today" value={model.earnedLabel} />
      <Stat label="Screen time used" value={model.spentLabel} align="flex-end" />
    </View>
  );
}

function Stat({
  label,
  value,
  align = "flex-start",
}: {
  label: string;
  value: string;
  align?: "flex-start" | "flex-end";
}) {
  const { spacing, typography } = useTheme();

  return (
    <View style={{ alignItems: align, gap: spacing.xs }}>
      <Text style={typography.caption}>{label}</Text>
      <Text style={typography.numeric}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
});
