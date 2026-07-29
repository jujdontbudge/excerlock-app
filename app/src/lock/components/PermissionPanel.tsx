import { StyleSheet, Text, View } from "react-native";

import type { ScreenTimeAuthorizationStatus } from "@/screentime";
import { Card, PillButton, useTheme } from "@/ui";

import { PERMISSION_COPY } from "../model/permissionCopy";

type PermissionPanelProps = {
  status: ScreenTimeAuthorizationStatus;
  onRequest: () => void;
  onOpenSettings: () => void;
};

/**
 * The permissions primer and its recovery path. A refusal is terminal on iOS —
 * `requestAuthorization` never asks twice — so the denied state stops offering
 * a button that cannot work and points at the one place that can fix it.
 */
export function PermissionPanel({
  status,
  onRequest,
  onOpenSettings,
}: PermissionPanelProps) {
  const { colors, spacing, typography } = useTheme();
  const copy = PERMISSION_COPY[status];
  const dotColor = {
    notDetermined: colors.textTertiary,
    approved: colors.success,
    denied: colors.danger,
  }[status];

  return (
    <Card style={{ gap: spacing.md }}>
      <View style={[styles.heading, { gap: spacing.md }]}>
        <Text style={[typography.cardTitle, styles.title]}>{copy.title}</Text>
        <View
          accessibilityLabel={`Screen Time access: ${copy.statusLabel}`}
          style={[styles.status, { gap: spacing.xs }]}
        >
          <View
            style={{
              backgroundColor: dotColor,
              borderRadius: spacing.xs,
              height: spacing.sm,
              width: spacing.sm,
            }}
          />
          <Text style={typography.caption}>{copy.statusLabel}</Text>
        </View>
      </View>
      <Text style={typography.body}>{copy.body}</Text>
      {copy.actionLabel === null ? null : (
        <PillButton
          label={copy.actionLabel}
          variant="white"
          onPress={status === "denied" ? onOpenSettings : onRequest}
        />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  heading: { alignItems: "flex-start", flexDirection: "row" },
  status: { alignItems: "center", flexDirection: "row" },
  title: { flex: 1 },
});
