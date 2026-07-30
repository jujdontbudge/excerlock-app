import { useState } from "react";
import {
  ScrollView,
  Text,
  View,
} from "react-native";

import { Card, useTheme } from "@/ui";
import {
  createMilestoneShareCardInput,
  MilestoneShareCardPreviewSheet,
  type ShareCardModule,
} from "@/shareCards";

import {
  isMilestoneId,
  type MilestoneId,
} from "./catalog";
import { MilestoneBadgeButton } from "./MilestoneBadgeButton";
import {
  buildMilestoneRows,
  progressForMilestone,
  type MilestoneBadge,
  type MilestoneMetrics,
} from "./progress";
import { useMilestoneUnlockStore } from "./unlockStore";

type MilestonesShelfProps = Readonly<{
  metrics: MilestoneMetrics;
  shareCardModule?: ShareCardModule;
}>;

type SelectedShare = Readonly<{
  badge: MilestoneBadge;
  unlockedAtMs: number;
}>;

export function MilestonesShelf({
  metrics,
  shareCardModule,
}: MilestonesShelfProps) {
  const { spacing, typography } = useTheme();
  const rows = buildMilestoneRows(metrics);
  const records = useMilestoneUnlockStore((state) => state.records);
  const markTapped = useMilestoneUnlockStore((state) => state.markTapped);
  const [selectedLockedId, setSelectedLockedId] =
    useState<MilestoneId | null>(null);
  const [selectedShare, setSelectedShare] =
    useState<SelectedShare | null>(null);
  const selected = rows
    .flatMap(({ badges }) => badges)
    .find(({ id }) => id === selectedLockedId);

  const pressBadge = (badge: MilestoneBadge) => {
    if (badge.state === "unlocked") {
      if (!isMilestoneId(badge.id)) return;
      const record = records[badge.id];
      if (record === undefined) return;
      markTapped(badge.id);
      setSelectedShare({ badge, unlockedAtMs: record.unlockedAtMs });
    } else {
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
                isNew={
                  isMilestoneId(badge.id) &&
                  records[badge.id]?.isNew === true
                }
                onPress={() => pressBadge(badge)}
              />
            ))}
          </ScrollView>
        </View>
      ))}

      {selected === undefined ? null : (
        <ProgressDetail badge={selected} metrics={metrics} />
      )}

      {selectedShare === null ? null : (
        <MilestoneShareCardPreviewSheet
          visible
          badgeArt={selectedShare.badge.badgeArt}
          input={createMilestoneShareCardInput({
            milestoneName: selectedShare.badge.milestoneName,
            achievementNumber: selectedShare.badge.threshold,
            unlockMonth: unlockMonth(selectedShare.unlockedAtMs),
          })}
          shareCardModule={shareCardModule}
          onClose={() => setSelectedShare(null)}
        />
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

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function unlockMonth(unlockedAtMs: number): string {
  const instant = new Date(unlockedAtMs);
  return `${MONTHS[instant.getMonth()]} ${instant.getFullYear()}`;
}
