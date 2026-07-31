import type { ConfiguredCondition } from "@excerlock/condition-model";
import { Text, View } from "react-native";

import { SectionHeader, useTheme } from "@/ui";

import { ConditionCard } from "../../components/cards/ConditionCard";
import { toConditionCards } from "../../model/conditionCards";
import { EMPTY_READING } from "../../model/reading";
import type { BannerSelection } from "../../banners/bannerCatalog";

/**
 * The last step shows the real card the condition will wear on Home — the same
 * model, built by the same function — so what the user approves is what lands.
 */
export function PreviewStep({
  condition,
  placeNames,
  banner,
}: {
  condition: ConfiguredCondition;
  placeNames?: Readonly<Record<string, string>>;
  banner?: BannerSelection;
}) {
  const { spacing, typography } = useTheme();
  const [card] = toConditionCards({
    conditions: [condition],
    reading: EMPTY_READING,
    ...(placeNames === undefined ? {} : { placeNames }),
    ...(banner === undefined ? {} : { conditionBanners: { [condition.id]: banner } }),
  });

  return (
    <View style={{ gap: spacing.md }}>
      <SectionHeader title="Preview" subtitle="This is the card it will wear on Home." />
      {card === undefined ? null : <ConditionCard model={card} onComplete={() => undefined} />}
      <Text style={typography.caption}>
        You can change or delete this condition any time from Manage.
      </Text>
    </View>
  );
}
