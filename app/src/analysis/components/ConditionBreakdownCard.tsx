import { StyleSheet, Text, View } from "react-native";

import { Card, useTheme } from "@/ui";

import {
  formatMinutes,
  type ConditionBreakdownItem,
} from "../model";

type ConditionBreakdownCardProps = {
  items: readonly ConditionBreakdownItem[];
  caption: string;
};

/** Banked minutes per condition over one selected Analysis window. */
export function ConditionBreakdownCard({
  items,
  caption,
}: ConditionBreakdownCardProps) {
  const { colors, spacing, typography } = useTheme();

  return (
    <Card testID="condition-breakdown-card" style={{ gap: spacing.md }}>
      <Text style={typography.caption}>{caption}</Text>

      {items.length === 0 ? (
        <View style={{ gap: spacing.xs }}>
          <Text accessibilityRole="header" style={typography.cardTitle}>
            No condition earnings yet
          </Text>
          <Text style={typography.body}>
            When a condition banks time, it will show up here.
          </Text>
        </View>
      ) : (
        items.map((item) => (
          <View
            key={item.conditionId}
            testID={`condition-earning-${item.conditionId}`}
            style={styles.row}
          >
            <Text style={[typography.cardTitle, styles.name]}>{item.name}</Text>
            <Text
              style={[
                item.status === "recorded" ? typography.numeric : typography.body,
                item.status === "notRecorded"
                  ? { color: colors.textTertiary }
                  : null,
              ]}
            >
              {item.status === "recorded"
                ? formatMinutes(item.earnedMinutes)
                : "not recorded"}
            </Text>
          </View>
        ))
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  name: { flex: 1 },
  row: { alignItems: "center", flexDirection: "row" },
});
