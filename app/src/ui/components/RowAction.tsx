import { Pressable, StyleSheet, Text } from "react-native";

import { useTheme } from "../theme";

/**
 * A quiet in-row action. `PillButton` is the screen-level pill and takes its
 * accessible name from its visible label; a row needs a short label and a name
 * that says which condition it belongs to.
 */
export function RowAction({
  label,
  accessibilityLabel,
  tone = "default",
  onPress,
}: {
  label: string;
  accessibilityLabel: string;
  tone?: "default" | "danger";
  onPress: () => void;
}) {
  const { colors, radius, spacing, typography } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={[
        styles.action,
        {
          backgroundColor: colors.pillSecondary,
          borderRadius: radius.pill,
          paddingHorizontal: spacing.lg,
        },
      ]}
    >
      <Text
        style={[
          typography.cardTitle,
          { color: tone === "danger" ? colors.danger : colors.textPrimary },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  action: { alignItems: "center", flex: 1, height: 44, justifyContent: "center" },
});
