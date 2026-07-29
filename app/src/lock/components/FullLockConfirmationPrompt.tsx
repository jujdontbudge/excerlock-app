import { Text, View } from "react-native";

import { PillButton, useTheme } from "@/ui";

import type { FullLockConfirmation } from "../model/fullLockCopy";

/** Shared confirmation content for every UI that crosses the Full Lock edge. */
export function FullLockConfirmationPrompt({
  confirmation,
  onConfirm,
  onCancel,
}: {
  confirmation: FullLockConfirmation;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}) {
  const { spacing, typography } = useTheme();

  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ gap: spacing.xs }}>
        <Text style={typography.cardTitle}>{confirmation.title}</Text>
        <Text style={typography.body}>{confirmation.body}</Text>
      </View>
      <PillButton
        label={confirmation.confirmLabel}
        variant="white"
        onPress={onConfirm}
      />
      <PillButton
        label={confirmation.cancelLabel}
        variant="secondary"
        onPress={onCancel}
      />
    </View>
  );
}
