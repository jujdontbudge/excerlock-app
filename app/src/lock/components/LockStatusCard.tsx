import { Text, View } from "react-native";

import { Card, SectionHeader, useTheme } from "@/ui";

import type { LockStatusModel } from "../model/lockStatus";

type LockStatusCardProps = {
  model: LockStatusModel;
};

/** What is shielded right now, why it is shielded, and when it lifts. */
export function LockStatusCard({ model }: LockStatusCardProps) {
  const { colors, spacing, typography } = useTheme();

  return (
    <Card variant="elevated" style={{ gap: spacing.md }} testID="lock-status">
      <SectionHeader title="Right now" />
      <View style={{ gap: spacing.xs }}>
        <Text style={typography.title}>{model.headline}</Text>
        <Text style={typography.body}>{model.reason}</Text>
      </View>
      <Text style={[typography.cardTitle, { color: colors.primary }]}>
        {model.nextChange}
      </Text>
      {model.status === "unconfigured" ? null : (
        <Text style={typography.caption}>{`Covering ${model.scope}`}</Text>
      )}
    </Card>
  );
}
