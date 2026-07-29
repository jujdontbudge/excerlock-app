import { Text, View } from "react-native";

import type { ScreenTimeSelectionSummary } from "@/screentime";
import { Card, PillButton, SectionHeader, useTheme } from "@/ui";

type LockedAppsCardProps = {
  /** The boundary's own summary — the only description of a selection there is. */
  selection: ScreenTimeSelectionSummary | null;
  canPick: boolean;
  onPick: () => void;
};

/**
 * The app/category picker's surface. It renders `displayName` and nothing else:
 * the handle behind it is opaque by law, and iOS never tells us an app's name.
 */
export function LockedAppsCard({
  selection,
  canPick,
  onPick,
}: LockedAppsCardProps) {
  const { spacing, typography } = useTheme();

  return (
    <Card style={{ gap: spacing.md }}>
      <SectionHeader title="Locked apps" />
      <View style={{ gap: spacing.xs }}>
        <Text style={typography.cardTitle}>
          {selection === null ? "Nothing is locked yet" : selection.displayName}
        </Text>
        <Text style={typography.body}>
          {selection === null
            ? "Choose the apps and categories ExcerLock may pause."
            : "iOS keeps the list itself — this count is all ExcerLock can see."}
        </Text>
      </View>
      {canPick ? (
        <PillButton
          label={selection === null ? "Choose apps" : "Change apps"}
          onPress={onPick}
        />
      ) : null}
    </Card>
  );
}
