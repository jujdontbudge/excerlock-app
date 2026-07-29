import { StyleSheet, Switch, Text, View } from "react-native";

import { Card, PillButton, useTheme } from "@/ui";

import type { ConditionRowModel } from "../model/conditionRows";
import { RowAction } from "./RowAction";

/**
 * One saved condition: what it is, what it earns, whether it is on, and the two
 * things Manage can do to it. Presentational — the confirmation is a prop, not
 * state, so the screen can guarantee only one row is ever asking.
 */
export function ConditionRow({
  model,
  confirmingDelete,
  onToggle,
  onEdit,
  onAskDelete,
  onConfirmDelete,
  onCancelDelete,
}: {
  model: ConditionRowModel;
  confirmingDelete: boolean;
  onToggle: (enabled: boolean) => void;
  onEdit: () => void;
  onAskDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}) {
  const { colors, spacing, typography } = useTheme();

  return (
    <Card testID={`manage-row-${model.id}`} variant="elevated" style={{ gap: spacing.md }}>
      <View style={[styles.header, { gap: spacing.md }]}>
        <View style={{ flexShrink: 1, gap: spacing.xs }}>
          <Text style={typography.cardTitle}>{model.title}</Text>
          <Text style={typography.caption}>{model.sourceLabel}</Text>
        </View>

        <View style={[styles.switch, { gap: spacing.xs }]}>
          <Switch
            testID={`manage-toggle-${model.id}`}
            accessibilityLabel={model.title}
            value={model.enabled}
            onValueChange={onToggle}
            trackColor={{ false: colors.pillSecondary, true: colors.primary }}
            ios_backgroundColor={colors.pillSecondary}
          />
          <Text
            testID={`manage-switch-label-${model.id}`}
            style={[typography.caption, { color: colors.textTertiary }]}
          >
            {model.enabled ? "On" : "Off"}
          </Text>
        </View>
      </View>

      <Text style={[typography.body, { opacity: model.enabled ? 1 : 0.5 }]}>{model.earnLabel}</Text>

      {confirmingDelete ? (
        <View style={{ gap: spacing.sm }}>
          <Text style={typography.body}>Delete this condition?</Text>
          <View style={[styles.actions, { gap: spacing.sm }]}>
            <PillButton label="Yes, delete" onPress={onConfirmDelete} style={styles.action} />
            <PillButton
              label="Keep"
              variant="secondary"
              onPress={onCancelDelete}
              style={styles.action}
            />
          </View>
        </View>
      ) : (
        <View style={[styles.actions, { gap: spacing.sm }]}>
          {/* The label a screen reader hears names the condition — a list of
              identical "Edit" buttons tells nobody which one they are on. */}
          <RowAction label="Edit" accessibilityLabel={`Edit ${model.title}`} onPress={onEdit} />
          <RowAction
            label="Delete"
            accessibilityLabel={`Delete ${model.title}`}
            tone="danger"
            onPress={onAskDelete}
          />
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  action: { flex: 1 },
  actions: { flexDirection: "row" },
  header: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between" },
  switch: { alignItems: "center" },
});
