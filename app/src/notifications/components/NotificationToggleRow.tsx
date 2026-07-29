import { Switch, Text, View } from "react-native";

import { useTheme } from "@/ui";

import type { NotificationType } from "../model/catalog";

export function NotificationToggleRow({
  type,
  enabled,
  disabled,
  onChange,
}: {
  type: NotificationType;
  enabled: boolean;
  disabled: boolean;
  onChange: (on: boolean) => void;
}) {
  const { colors, spacing, typography } = useTheme();

  return (
    <View
      style={{
        alignItems: "flex-start",
        flexDirection: "row",
        gap: spacing.md,
      }}
    >
      <View style={{ flex: 1, gap: spacing.xs }}>
        <Text style={typography.cardTitle}>{type.settingsTitle}</Text>
        <Text style={typography.body}>{type.settingsDescription}</Text>
      </View>
      <View style={{ alignItems: "center", gap: spacing.xs }}>
        <Switch
          testID={`notification-toggle-${type.id}`}
          accessibilityLabel={type.settingsTitle}
          disabled={disabled}
          value={enabled}
          onValueChange={onChange}
          trackColor={{
            false: colors.pillSecondary,
            true: colors.primary,
          }}
          ios_backgroundColor={colors.pillSecondary}
        />
        <Text style={typography.caption}>{enabled ? "On" : "Off"}</Text>
      </View>
    </View>
  );
}
