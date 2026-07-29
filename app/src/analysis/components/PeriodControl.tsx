import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/ui";

import type { AnalysisPeriod } from "../model";

const OPTIONS: readonly {
  value: AnalysisPeriod;
  label: string;
}[] = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

type PeriodControlProps = {
  selected: AnalysisPeriod;
  onSelect: (period: AnalysisPeriod) => void;
};

/** The mutually exclusive window behind the Analysis trend and its detail. */
export function PeriodControl({
  selected,
  onSelect,
}: PeriodControlProps) {
  const { colors, radius, spacing, typography } = useTheme();

  return (
    <View
      accessibilityLabel="Analysis period"
      style={[
        styles.track,
        {
          backgroundColor: colors.pillSecondary,
          borderRadius: radius.pill,
          gap: spacing.xs,
          padding: spacing.xs,
        },
      ]}
    >
      {OPTIONS.map(({ value, label }) => {
        const isSelected = value === selected;
        return (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelect(value)}
            style={[
              styles.option,
              {
                backgroundColor: isSelected
                  ? colors.primary
                  : "transparent",
                borderRadius: radius.pill,
                paddingVertical: spacing.sm,
              },
            ]}
          >
            <Text
              style={[
                typography.caption,
                {
                  color: isSelected
                    ? colors.onPrimary
                    : colors.textSecondary,
                },
              ]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  option: { alignItems: "center", flex: 1 },
  track: { flexDirection: "row" },
});
