import { Text, View } from "react-native";

import { useTheme } from "@/ui";

import {
  progressForMilestone,
  type MilestoneBadge,
  type MilestoneMetrics,
} from "./progress";

type MilestoneProgressDetailProps = Readonly<{
  badge: MilestoneBadge;
  metrics: MilestoneMetrics;
}>;

export function MilestoneProgressDetail({
  badge,
  metrics,
}: MilestoneProgressDetailProps) {
  const { colors, radius, spacing, typography } = useTheme();
  const progress = progressForMilestone(badge, metrics);

  return (
    <View
      testID="milestone-progress-detail"
      style={{
        backgroundColor: colors.cardElevated,
        borderRadius: radius.md,
        gap: spacing.xs,
        padding: spacing.md,
      }}
    >
      <Text style={typography.cardTitle}>{badge.milestoneName}</Text>
      <Text style={typography.numeric}>
        {`${progress.current} of ${progress.target} ${progressUnit(badge)}`}
      </Text>
      <Text style={typography.caption}>
        {progressContext(badge, metrics)}
      </Text>
    </View>
  );
}

function progressUnit(badge: MilestoneBadge): string {
  switch (badge.kind) {
    case "streak":
      return "days";
    case "activity":
      return "activities";
    case "timeReclaimed":
      return "hours";
  }
}

function progressContext(
  badge: MilestoneBadge,
  metrics: MilestoneMetrics,
): string {
  switch (badge.kind) {
    case "streak":
      return `Current streak · best ${metrics.longestStreakDays} days`;
    case "activity":
      return "Meaningful condition-days on record";
    case "timeReclaimed":
      return "Measured against your onboarding baseline";
  }
}
