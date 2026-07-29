import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { PillButton, Screen } from "../components";
import { Glyph } from "../icons";
import { useTheme } from "../theme";

type HomeScreenProps = {
  /**
   * Opens the condition builder. Defaults to the Manage tab, which is where the
   * builder sheet will be reachable from (PRD §3.15 non-tab surface 4).
   */
  onCreateFirstCondition?: () => void;
};

/**
 * Home in its empty-start state. ExcerLock pre-creates zero conditions (PRD §8
 * Conditions, decided 2026-07-28) — until the user builds one there is no
 * balance, no lock hero and no condition card, only the invitation to build.
 */
export function HomeScreen({ onCreateFirstCondition = openBuilder }: HomeScreenProps) {
  const { colors, radius, spacing, typography } = useTheme();

  return (
    <Screen testID="home-screen" style={[styles.content, { padding: spacing.gutter }]}>
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
          { marginTop: spacing.sm, marginBottom: spacing.xl },
        ]}
      >
        ExcerLock starts empty. Build the first condition that decides how you earn your screen time.
      </Text>

      <PillButton
        label="Create your first condition"
        variant="white"
        trailingIcon="arrowRight"
        onPress={onCreateFirstCondition}
        style={styles.cta}
      />
    </Screen>
  );
}

function openBuilder() {
  router.navigate("/manage");
}

const styles = StyleSheet.create({
  centred: { maxWidth: 300, textAlign: "center" },
  chip: { alignItems: "center", height: 88, justifyContent: "center", width: 88 },
  content: { alignItems: "center", flex: 1, justifyContent: "center" },
  cta: { alignSelf: "stretch" },
});
