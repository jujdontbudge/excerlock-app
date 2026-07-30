import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useTheme } from "@/ui";

import type { MilestoneBadge } from "./progress";
import { ProgressRing } from "./ProgressRing";

export const LOCKED_BADGE_TINT = "#7E7781";

type MilestoneBadgeButtonProps = Readonly<{
  badge: MilestoneBadge;
  onPress: () => void;
}>;

export function MilestoneBadgeButton({
  badge,
  onPress,
}: MilestoneBadgeButtonProps) {
  const { colors, typography } = useTheme();
  const unlocked = badge.state === "unlocked";
  const art = (
    <Image
      accessibilityIgnoresInvertColors
      resizeMode="contain"
      source={badge.badgeArt}
      tintColor={unlocked ? undefined : LOCKED_BADGE_TINT}
      style={styles.art}
      testID={`milestone-art-${badge.id}`}
    />
  );
  const accessibilityLabel = unlocked
    ? `${badge.thresholdLabel}, unlocked`
    : [
        badge.thresholdLabel,
        "locked",
        badge.progress?.label,
      ]
        .filter(Boolean)
        .join(", ");

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={
        unlocked
          ? "Opens the milestone share card"
          : "Shows progress toward this milestone"
      }
      onPress={onPress}
      style={styles.button}
      testID={`milestone-badge-${badge.id}`}
    >
      {badge.progress === null ? (
        <View style={styles.artWell}>{art}</View>
      ) : (
        <ProgressRing
          fraction={badge.progress.fraction}
          accessibilityLabel={`${badge.progress.label} milestone progress`}
        >
          {art}
        </ProgressRing>
      )}
      <Text
        numberOfLines={2}
        style={[
          typography.caption,
          styles.label,
          unlocked ? null : { color: colors.textSecondary },
        ]}
      >
        {badge.thresholdLabel}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  art: { height: 56, width: 56 },
  artWell: {
    alignItems: "center",
    height: 68,
    justifyContent: "center",
    width: 68,
  },
  button: { alignItems: "center", width: 76 },
  label: { minHeight: 34, textAlign: "center" },
});
