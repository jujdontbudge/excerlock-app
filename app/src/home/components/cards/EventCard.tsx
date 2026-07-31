import { Text, View } from "react-native";

import { PillButton, useTheme } from "@/ui";

import type { EventCardModel } from "../../model/conditionCards";
import { ProgressBar } from "../ProgressBar";
import { CardShell } from "./CardShell";
import { RewardBadge } from "./RewardBadge";

/**
 * The mocked card variant: a goal, its meter, and the button that doubles as
 * claim-on-detection (PRD §3.15). Completion is permanent for the day — the
 * earn moment plays out in place, with no takeover (decided 2026-07-28).
 */
export function EventCard({
  model,
  onComplete,
}: {
  model: EventCardModel;
  onComplete: (conditionId: string) => void;
}) {
  const { spacing, typography } = useTheme();

  return (
    <CardShell
      title={model.title}
      subtitle={model.sourceLabel}
      banner={model.banner}
      badge={<RewardBadge label={model.rewardLabel} />}
    >
      {model.progressLabel === undefined ? null : (
        <View style={{ gap: spacing.sm }}>
          <ProgressBar value={model.progress} testID={`condition-progress-${model.id}`} />
          <Text style={typography.body}>{model.progressLabel}</Text>
        </View>
      )}

      <PillButton
        label={model.completed ? "✓ Completed" : model.actionLabel}
        variant={model.completed ? "secondary" : "white"}
        disabled={model.completed}
        onPress={() => onComplete(model.id)}
      />
    </CardShell>
  );
}
