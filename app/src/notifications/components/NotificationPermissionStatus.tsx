import { Text, View } from "react-native";

import { PERMISSION_COPY } from "@/lock";
import { PillButton, useTheme } from "@/ui";

import type { NotificationAuthorizationStatus } from "../NotificationModule";

const STATUS_COPY: Readonly<
  Record<
    NotificationAuthorizationStatus,
    Readonly<{ title: string; body: string }>
  >
> = {
  notDetermined: {
    title: "Notifications are not set up",
    body: "Nothing is sent unless you turn on one of the choices below.",
  },
  approved: {
    title: "Notifications are on",
    body: "Only the reminder types you choose can speak.",
  },
  denied: {
    title: "Notifications are off",
    body: "Turn them back on in iOS Settings, then come back to choose what helps.",
  },
};

export function NotificationPermissionStatus({
  authorization,
  ready,
  openSettings,
}: {
  authorization: NotificationAuthorizationStatus;
  ready: boolean;
  openSettings: () => void;
}) {
  const { colors, spacing, typography } = useTheme();
  const copy = STATUS_COPY[authorization];
  const sharedStatus = PERMISSION_COPY[authorization].statusLabel;
  const dotColor = {
    notDetermined: colors.textTertiary,
    approved: colors.success,
    denied: colors.danger,
  }[authorization];

  return (
    <>
      <View
        style={{
          alignItems: "flex-start",
          flexDirection: "row",
          gap: spacing.md,
        }}
      >
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Text style={typography.cardTitle}>{copy.title}</Text>
          <Text style={typography.body}>{copy.body}</Text>
        </View>
        <View
          accessibilityLabel={`Notifications access: ${
            ready ? sharedStatus : "Checking"
          }`}
          style={{ alignItems: "center", flexDirection: "row", gap: spacing.xs }}
        >
          <View
            style={{
              backgroundColor: dotColor,
              borderRadius: spacing.xs,
              height: spacing.sm,
              width: spacing.sm,
            }}
          />
          <Text style={typography.caption}>
            {ready ? sharedStatus : "Checking"}
          </Text>
        </View>
      </View>
      {authorization === "denied" ? (
        <PillButton
          label="Open Settings"
          variant="secondary"
          onPress={openSettings}
        />
      ) : null}
    </>
  );
}
