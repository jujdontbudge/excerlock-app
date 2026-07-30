import { useState } from "react";
import {
  ScrollView,
  Text,
  View,
} from "react-native";

import { Card, useTheme } from "@/ui";

import { type MilestoneId } from "./catalog";
import { MilestoneBadgeButton } from "./MilestoneBadgeButton";
import {
  buildMilestoneRows,
  progressForMilestone,
  type MilestoneBadge,
  type MilestoneMetrics,
} from "./progress";

type MilestonesShelfProps = Readonly<{
  metrics: MilestoneMetrics;
}>;

export function MilestonesShelf({ metrics }: MilestonesShelfProps) {
  const { spacing, typography } = useTheme();
  const rows = buildMilestoneRows(metrics);
  const [selectedLockedId, setSelectedLockedId] =
    useState<MilestoneId | null>(null);
  const selected = rows
    .flatMap(({ badges }) => badges)
    .find(({ id }) => id === selectedLockedId);

  const pressBadge = (badge: MilestoneBadge) => {
    if (badge.state !== "unlocked") {
      setSelectedLockedId(badge.id as MilestoneId);
    }
  };

  return (
    <Card testID="milestones-shelf" style={{ gap: spacing.lg }}>
      {rows.map(({ badges, kind, title }) => (
        <View key={kind} style={{ gap: spacing.sm }}>
          <Text accessibilityRole="header" style={typography.cardTitle}>
            {title}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing.sm }}
          >
            {badges.map((badge) => (
              <MilestoneBadgeButton
                key={badge.id}
                badge={badge}
                onPress={() => pressBadge(badge)}
              />
            ))}
          </ScrollView>
        </View>
      ))}

      {selected === undefined ? null : (
        <ProgressDetail badge={selected} metrics={metrics} />
      )}
    </Card>
  );
}

function ProgressDetail({
  badge,
  metrics,
}: {
  badge: MilestoneBadge;
  metrics: MilestoneMetrics;
}) {
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
