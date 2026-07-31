import { Text } from "react-native";

import { useTheme } from "@/ui";

import type { RateCardModel } from "../../model/conditionCards";
import { CardShell } from "./CardShell";
import { RewardBadge } from "./RewardBadge";

/**
 * The meter variant: today's banked total for a proportional exchange. Rates
 * have no daily cap — the ratio is the throttle (decided 2026-07-28).
 */
export function RateCard({ model }: { model: RateCardModel }) {
  const { colors, typography } = useTheme();

  return (
    <CardShell
      title={model.title}
      subtitle={model.sourceLabel}
      banner={model.banner}
      badge={<RewardBadge label={model.ratioLabel} />}
    >
      <Text style={[typography.body, { color: colors.textPrimary }]}>{model.meterLabel}</Text>
    </CardShell>
  );
}
