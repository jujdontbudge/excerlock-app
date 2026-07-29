import { StyleSheet, Text, View } from "react-native";

import { Glyph, useTheme } from "@/ui";

import type { LockHeroModel } from "../model/lockState";

/**
 * The app's soul (PRD §3.15 Tab 1): the padlock, the balance numeral, and one
 * line saying why the lock is where it is. It renders a model and computes
 * nothing.
 */
export function LockHero({ model }: { model: LockHeroModel }) {
  const { colors, radius, spacing, typography } = useTheme();
  const locked = model.status === "locked";

  return (
    <View testID={`lock-hero-${model.status}`} style={[styles.hero, { gap: spacing.md }]}>
      <View
        accessibilityLabel={locked ? "Locked" : "Unlocked"}
        style={[
          styles.chip,
          {
            backgroundColor: locked ? colors.card : colors.cardElevated,
            borderRadius: radius.pill,
            opacity: locked ? 1 : 0.75,
          },
        ]}
      >
        <Glyph name="lock" size={44} color={colors.textPrimary} />
      </View>

      <View style={[styles.numeral, { gap: spacing.xs }]}>
        <Text testID="lock-hero-balance" style={typography.hero}>
          {model.balance.value}
        </Text>
        <Text style={[typography.heroSuffix, styles.suffix]}>{model.balance.unit}</Text>
      </View>

      <Text accessibilityRole="header" style={typography.title}>
        {model.headline}
      </Text>
      <Text style={[typography.body, styles.detail, { color: colors.textPrimary }]}>
        {model.detail}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { alignItems: "center", height: 96, justifyContent: "center", width: 96 },
  detail: { textAlign: "center" },
  hero: { alignItems: "center" },
  numeral: { alignItems: "flex-end", flexDirection: "row" },
  suffix: { paddingBottom: 16 },
});
