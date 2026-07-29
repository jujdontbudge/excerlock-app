import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/ui";

export interface PillOption<Value> {
  readonly value: Value;
  readonly label: string;
}

/** A row of mutually exclusive choices. Nothing is selected until the user picks. */
export function OptionPills<Value extends string | number>({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: readonly PillOption<Value>[];
  selected?: Value;
  onSelect: (value: Value) => void;
}) {
  const { colors, radius, spacing, typography } = useTheme();

  return (
    <View accessibilityLabel={label} style={[styles.row, { gap: spacing.sm }]}>
      {options.map((option) => {
        const isSelected = option.value === selected;
        return (
          <Pressable
            key={String(option.value)}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelect(option.value)}
            style={{
              backgroundColor: isSelected ? colors.primary : colors.pillSecondary,
              borderRadius: radius.pill,
              paddingHorizontal: spacing.gutter,
              paddingVertical: spacing.sm,
            }}
          >
            <Text style={[typography.caption, { color: colors.textPrimary }]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap" },
});
