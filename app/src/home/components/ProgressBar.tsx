import { StyleSheet, View } from "react-native";

import { useTheme } from "@/ui";

/** The goal meter used by event and rate cards. `value` is 0–1 and is clamped. */
export function ProgressBar({ value, testID }: { value: number; testID?: string }) {
  const { colors, radius } = useTheme();
  const filled = Math.max(0, Math.min(1, value));

  return (
    <View
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(filled * 100) }}
      style={[styles.track, { backgroundColor: colors.pillSecondary, borderRadius: radius.pill }]}
    >
      <View
        style={[
          styles.fill,
          {
            backgroundColor: colors.textPrimary,
            borderRadius: radius.pill,
            width: `${filled * 100}%`,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { height: "100%" },
  track: { height: 8, overflow: "hidden", width: "100%" },
});
