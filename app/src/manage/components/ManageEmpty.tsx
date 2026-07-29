import { StyleSheet, Text, View } from "react-native";

import { Glyph, PillButton, useTheme } from "@/ui";

/**
 * Manage before the first condition exists. Creating one is Home's job (#40) —
 * this screen never grows a second create affordance, it points at that one.
 */
export function ManageEmpty({ onGoHome }: { onGoHome: () => void }) {
  const { colors, radius, spacing, typography } = useTheme();

  return (
    <View testID="manage-empty" style={[styles.content, { padding: spacing.gutter }]}>
      <View
        style={[
          styles.chip,
          { backgroundColor: colors.card, borderRadius: radius.pill, marginBottom: spacing.lg },
        ]}
      >
        <Glyph name="manage" size={38} color={colors.textPrimary} />
      </View>

      <Text accessibilityRole="header" style={typography.title}>
        Nothing to manage yet
      </Text>
      <Text
        style={[
          typography.body,
          styles.centred,
          { color: colors.textSecondary, marginBottom: spacing.lg, marginTop: spacing.sm },
        ]}
      >
        Build your first condition on Home — it will show up here.
      </Text>

      <PillButton
        label="Go to Home"
        variant="white"
        trailingIcon="arrowRight"
        onPress={onGoHome}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  centred: { textAlign: "center" },
  chip: { alignItems: "center", height: 88, justifyContent: "center", width: 88 },
  content: { alignItems: "center", flex: 1, justifyContent: "center" },
});
