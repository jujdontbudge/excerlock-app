import { Pressable, StyleSheet, Text, View } from "react-native";

import { PillButton, useTheme } from "@/ui";

import type { RecurringLockWindow } from "../model/recurringLockWindow";
import {
  formatWindowDays,
  formatWindowTime,
  windowActionName,
} from "../model/windowCopy";

export function LockWindowRow({
  window,
  deleting,
  onEdit,
  onAskDelete,
  onConfirmDelete,
  onKeep,
}: {
  window: RecurringLockWindow;
  deleting: boolean;
  onEdit: () => void;
  onAskDelete: () => void;
  onConfirmDelete: () => Promise<void>;
  onKeep: () => void;
}) {
  const { colors, radius, spacing, typography } = useTheme();
  return (
    <View
      style={{
        backgroundColor: colors.cardElevated,
        borderRadius: radius.md,
        gap: spacing.md,
        padding: spacing.md,
      }}
    >
      <View style={{ gap: spacing.xs }}>
        <Text style={typography.cardTitle}>
          {formatWindowDays(window.days)}
        </Text>
        <Text style={typography.body}>{formatWindowTime(window)}</Text>
      </View>
      {deleting ? (
        <View style={{ gap: spacing.sm }}>
          <Text style={typography.cardTitle}>Delete this lock window?</Text>
          <PillButton
            label="Yes, delete window"
            variant="white"
            onPress={onConfirmDelete}
          />
          <PillButton label="Keep it" variant="secondary" onPress={onKeep} />
        </View>
      ) : (
        <View style={[styles.actions, { gap: spacing.lg }]}>
          <RowAction
            label="Edit"
            accessibilityLabel={windowActionName("Edit", window)}
            onPress={onEdit}
          />
          <RowAction
            label="Delete"
            accessibilityLabel={windowActionName("Delete", window)}
            onPress={onAskDelete}
          />
        </View>
      )}
    </View>
  );
}

function RowAction({
  label,
  accessibilityLabel,
  onPress,
}: {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  const { colors, spacing, typography } = useTheme();
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={spacing.sm}
      onPress={onPress}
    >
      <Text style={[typography.cardTitle, { color: colors.primary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row" },
});
