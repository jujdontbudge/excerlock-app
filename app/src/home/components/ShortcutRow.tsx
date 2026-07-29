import { Pressable, StyleSheet, Text } from "react-native";

import { Glyph, useTheme, type GlyphName } from "@/ui";

/**
 * The Edit and Analysis rows from the mockup — they teleport to tabs 2 and 3
 * and hold no state of their own (PRD §3.15 Tab 1).
 */
export function ShortcutRow({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: GlyphName;
  onPress: () => void;
}) {
  const { colors, radius, spacing, typography } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[
        styles.row,
        {
          backgroundColor: colors.card,
          borderRadius: radius.sm,
          paddingHorizontal: spacing.gutter,
        },
      ]}
    >
      <Text style={typography.cardTitle}>{label}</Text>
      <Glyph name={icon} size={18} color={colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    height: 44,
    justifyContent: "space-between",
  },
});
