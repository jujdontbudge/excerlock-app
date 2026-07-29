import { StyleSheet, Text, View } from "react-native";

import { Glyph, PillButton, useTheme } from "@/ui";

/**
 * Home before the first condition exists. ExcerLock pre-creates zero conditions
 * (PRD §8, decided 2026-07-28), so this is a designed moment rather than an
 * error state: no balance, no hero, no card — only the invitation to build one.
 */
export function EmptyStart({ onCreate }: { onCreate: () => void }) {
  const { colors, radius, spacing, typography } = useTheme();

  return (
    <View testID="home-empty-start" style={[styles.content, { padding: spacing.gutter }]}>
      <View
        style={[
          styles.chip,
          { backgroundColor: colors.card, borderRadius: radius.pill, marginBottom: spacing.lg },
        ]}
      >
        <Glyph name="lock" size={38} color={colors.textPrimary} />
      </View>

      <Text accessibilityRole="header" style={typography.title}>
        No conditions yet
      </Text>
      <Text
        style={[
          typography.body,
          styles.centred,
          { color: colors.textPrimary, marginTop: spacing.sm, marginBottom: spacing.xl },
        ]}
      >
        ExcerLock starts empty. Build the first condition that decides how you earn your screen time.
      </Text>

      <PillButton
        label="Create your first condition"
        variant="white"
        trailingIcon="arrowRight"
        onPress={onCreate}
        style={styles.cta}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  centred: { maxWidth: 300, textAlign: "center" },
  chip: { alignItems: "center", height: 88, justifyContent: "center", width: 88 },
  content: { alignItems: "center", flex: 1, justifyContent: "center" },
  cta: { alignSelf: "stretch" },
});
