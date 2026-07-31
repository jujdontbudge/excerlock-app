import { useState } from "react";
import {
  ScrollView,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";

import { Card, useTheme } from "@/ui";
import type { ShareCardModule } from "@/shareCards";

import {
  isMilestoneId,
  type MilestoneId,
} from "./catalog";
import { MilestoneBadgeButton } from "./MilestoneBadgeButton";
import { MilestoneProgressDetail } from "./MilestoneProgressDetail";
import { MilestoneSharePreview } from "./MilestoneSharePreview";
import {
  buildMilestoneRows,
  type MilestoneBadge,
  type MilestoneMetrics,
} from "./progress";
import { useMilestoneUnlockAnimation } from "./useMilestoneUnlockAnimation";
import { useMilestoneShareRequest } from "./useMilestoneShareRequest";

type MilestonesShelfProps = Readonly<{
  metrics: MilestoneMetrics;
  onLayout?: (event: LayoutChangeEvent) => void;
  onRowLayout?: (
    kind: MilestoneBadge["kind"],
    event: LayoutChangeEvent,
  ) => void;
  shareCardModule?: ShareCardModule;
  unlockReady?: boolean;
  unlockSequence?: readonly MilestoneId[];
}>;

export function MilestonesShelf({
  metrics,
  onLayout,
  onRowLayout,
  shareCardModule,
  unlockReady = false,
  unlockSequence = [],
}: MilestonesShelfProps) {
  const { spacing, typography } = useTheme();
  const rows = buildMilestoneRows(metrics);
  const badges = rows.flatMap((row) => row.badges);
  const unlockScales = useMilestoneUnlockAnimation(
    unlockSequence,
    unlockReady,
  );
  const { closeShare, records, requestShare, selection } =
    useMilestoneShareRequest(badges);
  const [selectedLockedId, setSelectedLockedId] =
    useState<MilestoneId | null>(null);
  const selected = badges
    .find(({ id }) => id === selectedLockedId);

  const pressBadge = (badge: MilestoneBadge) => {
    if (!isMilestoneId(badge.id)) return;
    if (badge.state === "unlocked") {
      requestShare(badge.id);
    } else {
      setSelectedLockedId(badge.id);
    }
  };

  return (
    <View onLayout={onLayout} testID="milestones-shelf-layout">
      <Card testID="milestones-shelf" style={{ gap: spacing.lg }}>
        {rows.map(({ badges, kind, title }) => (
          <View
            key={kind}
            onLayout={(event) => onRowLayout?.(kind, event)}
            style={{ gap: spacing.sm }}
            testID={`milestone-row-${kind}`}
          >
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
                unlockSequence={
                  isMilestoneId(badge.id) &&
                  unlockSequence.includes(badge.id)
                    ? {
                        index: unlockSequence.indexOf(badge.id),
                        scale: unlockScales.get(badge.id)!,
                        total: unlockSequence.length,
                      }
                    : null
                }
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
        <MilestoneProgressDetail badge={selected} metrics={metrics} />
      )}

      {selection === null ? null : (
        <MilestoneSharePreview
          selection={selection}
          shareCardModule={shareCardModule}
          onClose={closeShare}
        />
      )}
      </Card>
    </View>
  );
}
