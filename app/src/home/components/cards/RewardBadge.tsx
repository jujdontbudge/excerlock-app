import { Text, View } from "react-native";

import { useTheme } from "@/ui";

/** The payout a card pays, in the stadium pill the mockup puts top-right. */
export function RewardBadge({ label }: { label: string }) {
  const { colors, radius, spacing, typography } = useTheme();

  return (
    <View
      style={{
        backgroundColor: colors.pillSecondary,
        borderRadius: radius.pill,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
      }}
    >
      <Text style={[typography.caption, { color: colors.textPrimary }]}>{label}</Text>
    </View>
  );
}
