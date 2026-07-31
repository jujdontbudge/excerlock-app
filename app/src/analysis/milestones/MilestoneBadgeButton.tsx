import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useTheme } from "@/ui";

import { MilestoneNewGlint } from "./MilestoneNewGlint";
import type { MilestoneBadge } from "./progress";
import { ProgressRing } from "./ProgressRing";

export const LOCKED_BADGE_TINT = "#7E7781";

type MilestoneBadgeButtonProps = Readonly<{
  badge: MilestoneBadge;
  isNew: boolean;
  onPress: () => void;
  unlockSequence: Readonly<{
    index: number;
    ready: boolean;
    scale: Animated.Value;
    total: number;
  }> | null;
}>;

export function MilestoneBadgeButton({
  badge,
  isNew,
  onPress,
  unlockSequence,
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

  const button = (
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
      {isNew ? (
        <MilestoneNewGlint
          active={unlockSequence?.ready === true}
          badgeId={badge.id}
          index={unlockSequence?.index ?? 0}
        />
      ) : null}
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

  return unlockSequence === null ? (
    button
  ) : (
    <Animated.View
      accessible
      accessibilityLabel={`New milestone ${unlockSequence.index + 1} of ${unlockSequence.total}`}
      style={{ transform: [{ scale: unlockSequence.scale }] }}
      testID={`milestone-unlock-animation-${badge.id}`}
    >
      {button}
    </Animated.View>
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
