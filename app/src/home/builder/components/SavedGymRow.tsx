import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { PillButton, RowAction, useTheme } from "@/ui";

import type { SavedPlace } from "../../store/homeState";

/**
 * One saved gym in the gym step: pick it, rename it, or forget it. Renaming
 * and the delete confirmation are this row's own state; every change leaves
 * through a callback, so the row owns no gym.
 */
export function SavedGymRow({
  place,
  selected,
  selectable,
  reason,
  onPick,
  onRename,
  onRemove,
}: {
  place: SavedPlace;
  selected: boolean;
  /** False when the picker says this gym's condition already exists. */
  selectable: boolean;
  /** The picker's own wording for why it is greyed. */
  reason?: string;
  onPick: () => void;
  onRename: (name: string) => void;
  onRemove: () => void;
}) {
  const { colors, radius, spacing, typography } = useTheme();
  const [renaming, setRenaming] = useState<string | undefined>(undefined);
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderColor: selected ? colors.textPrimary : "transparent",
        borderRadius: radius.md,
        borderWidth: 1,
        gap: spacing.sm,
        opacity: selectable ? 1 : 0.45,
        padding: spacing.gutter,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={place.name}
        accessibilityState={{ disabled: !selectable, selected }}
        disabled={!selectable}
        onPress={onPick}
      >
        <Text style={typography.cardTitle}>{place.name}</Text>
      </Pressable>
      {reason === undefined ? null : (
        <Text style={[typography.caption, { color: colors.textTertiary }]}>{reason}</Text>
      )}

      {renaming === undefined ? null : (
        <View style={{ gap: spacing.sm }}>
          <TextInput
            accessibilityLabel={`New name for ${place.name}`}
            autoCapitalize="words"
            autoCorrect={false}
            autoFocus
            onChangeText={setRenaming}
            placeholderTextColor={colors.textTertiary}
            style={[
              typography.body,
              {
                backgroundColor: colors.pillSecondary,
                borderRadius: radius.sm,
                color: colors.textPrimary,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.md,
              },
            ]}
            value={renaming}
          />
          <View style={[styles.actions, { gap: spacing.sm }]}>
            <PillButton
              label="Save name"
              variant="white"
              disabled={renaming.trim().length === 0}
              onPress={() => {
                onRename(renaming.trim());
                setRenaming(undefined);
              }}
              style={styles.action}
            />
            <PillButton
              label="Cancel"
              variant="secondary"
              onPress={() => setRenaming(undefined)}
              style={styles.action}
            />
          </View>
        </View>
      )}

      {confirmingRemove ? (
        <View style={{ gap: spacing.sm }}>
          <Text style={typography.body}>
            {`Forget ${place.name}? Conditions that use it go too.`}
          </Text>
          <View style={[styles.actions, { gap: spacing.sm }]}>
            <PillButton
              label="Yes, forget it"
              onPress={() => {
                setConfirmingRemove(false);
                onRemove();
              }}
              style={styles.action}
            />
            <PillButton
              label="Keep it"
              variant="secondary"
              onPress={() => setConfirmingRemove(false)}
              style={styles.action}
            />
          </View>
        </View>
      ) : null}

      {renaming === undefined && !confirmingRemove ? (
        <View style={[styles.actions, { gap: spacing.sm }]}>
          {/* The name a screen reader hears says which gym — a column of
              identical "Rename" buttons tells nobody which one they are on. */}
          <RowAction
            label="Rename"
            accessibilityLabel={`Rename ${place.name}`}
            onPress={() => setRenaming(place.name)}
          />
          <RowAction
            label="Remove"
            accessibilityLabel={`Remove ${place.name}`}
            tone="danger"
            onPress={() => setConfirmingRemove(true)}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  action: { flex: 1 },
  actions: { flexDirection: "row" },
});
