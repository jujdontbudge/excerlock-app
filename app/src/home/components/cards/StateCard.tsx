import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/ui";

import type { StateCardModel } from "../../model/conditionCards";
import { CardShell } from "./CardShell";

/**
 * The live variant: a state condition holds the shields open while it is true.
 * It never banks, so it shows status rather than a meter.
 */
export function StateCard({ model }: { model: StateCardModel }) {
  const { colors, spacing, typography } = useTheme();

  return (
    <CardShell title={model.title} subtitle={model.sourceLabel}>
      <View style={[styles.status, { gap: spacing.sm }]}>
        <View
          testID={`condition-state-dot-${model.id}`}
          style={[
            styles.dot,
            { backgroundColor: model.active ? colors.success : colors.textTertiary },
          ]}
        />
        <Text style={[typography.body, { color: colors.textPrimary }]}>{model.statusLabel}</Text>
      </View>
      <Text style={typography.caption}>{model.graceLabel}</Text>
    </CardShell>
  );
}

const styles = StyleSheet.create({
  dot: { borderRadius: 5, height: 10, width: 10 },
  status: { alignItems: "center", flexDirection: "row" },
});
