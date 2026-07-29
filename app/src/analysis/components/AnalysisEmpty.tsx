import { StyleSheet, Text, View } from "react-native";

import { Glyph, useTheme } from "@/ui";

/**
 * Day zero. ExcerLock ships with no conditions, so a new user's ledger is empty
 * and every card here would read zero — which looks like failure rather than a
 * beginning. Home's empty start says the same thing: nothing exists yet, and
 * that is the normal first screen.
 */
export function AnalysisEmpty() {
  const { colors, radius, spacing, typography } = useTheme();

  return (
    <View testID="analysis-empty" style={[styles.content, { padding: spacing.gutter }]}>
      <View
        style={[
          styles.chip,
          { backgroundColor: colors.card, borderRadius: radius.pill, marginBottom: spacing.lg },
        ]}
      >
        <Glyph name="analysis" size={34} color={colors.textPrimary} />
      </View>

      <Text accessibilityRole="header" style={typography.title}>
        Nothing to analyse yet
      </Text>
      <Text style={[typography.body, styles.centred, { marginTop: spacing.sm }]}>
        Your first earned minute starts the record. Days, streaks and the earned-versus-spent
        balance appear here from day one.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centred: { maxWidth: 300, textAlign: "center" },
  chip: { alignItems: "center", height: 88, justifyContent: "center", width: 88 },
  content: { alignItems: "center", flex: 1, justifyContent: "center" },
});
