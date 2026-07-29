import { Pressable, StyleSheet, Text, View } from "react-native";

import { SectionHeader, useTheme } from "@/ui";

import type { CatalogGroup, CatalogOption } from "../builderCatalog";

/**
 * Builder step 1: a menu of human-named conditions grouped by activity. Taken
 * and blocked entries stay visible and greyed with the picker's reason inline —
 * the user never has to guess why something is unavailable (PRD §3.3).
 */
export function CatalogStep({
  groups,
  onPick,
}: {
  groups: readonly CatalogGroup[];
  onPick: (option: CatalogOption) => void;
}) {
  const { spacing } = useTheme();

  return (
    <View style={{ gap: spacing.lg }}>
      {groups.map((group) => (
        <View key={group.activity} style={{ gap: spacing.md }}>
          <SectionHeader title={group.title} />
          {group.options.map((option) => (
            <CatalogRow key={option.catalogId} option={option} onPick={onPick} />
          ))}
        </View>
      ))}
    </View>
  );
}

function CatalogRow({
  option,
  onPick,
}: {
  option: CatalogOption;
  onPick: (option: CatalogOption) => void;
}) {
  const { colors, radius, spacing, typography } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={option.name}
      accessibilityState={{ disabled: !option.selectable }}
      disabled={!option.selectable}
      onPress={() => onPick(option)}
      style={[
        styles.row,
        {
          backgroundColor: colors.card,
          borderRadius: radius.md,
          gap: spacing.xs,
          opacity: option.selectable ? 1 : 0.45,
          padding: spacing.gutter,
        },
      ]}
    >
      <Text style={typography.cardTitle}>{option.name}</Text>
      {option.reason === undefined ? null : (
        <Text style={[typography.caption, { color: colors.textTertiary }]}>{option.reason}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { width: "100%" },
});
