import { Pressable, StyleSheet, Text, View } from "react-native";

import { SectionHeader, useTheme } from "@/ui";

import type { CatalogOption, SourceOption } from "../builderCatalog";

/**
 * Builder step 2, shown only when more than one source can provide the signal.
 * Weak coverage is selectable but never promoted, and says what it will cost
 * (§3.5c coverage matrix, surfaced by the picker).
 */
export function SourceStep({
  option,
  onPick,
}: {
  option: CatalogOption;
  onPick: (source: SourceOption) => void;
}) {
  const { spacing } = useTheme();

  return (
    <View style={{ gap: spacing.md }}>
      <SectionHeader title="Where does this come from?" subtitle={option.name} />
      {option.sources.map((source) => (
        <SourceRow key={`${source.source}:${source.placeId ?? ""}`} source={source} onPick={onPick} />
      ))}
    </View>
  );
}

function SourceRow({
  source,
  onPick,
}: {
  source: SourceOption;
  onPick: (source: SourceOption) => void;
}) {
  const { colors, radius, spacing, typography } = useTheme();
  const note = source.reason ?? source.note;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={source.label}
      accessibilityState={{ disabled: !source.selectable }}
      disabled={!source.selectable}
      onPress={() => onPick(source)}
      style={[
        styles.row,
        {
          backgroundColor: colors.card,
          borderRadius: radius.md,
          gap: spacing.xs,
          opacity: source.selectable ? 1 : 0.45,
          padding: spacing.gutter,
        },
      ]}
    >
      <Text style={typography.cardTitle}>{source.label}</Text>
      {source.isRecommended ? (
        <Text style={[typography.caption, { color: colors.success }]}>Recommended</Text>
      ) : null}
      {note === undefined ? null : (
        <Text style={[typography.caption, { color: colors.textTertiary }]}>{note}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { width: "100%" },
});
