import { openSettings as openSystemSettings } from "expo-linking";
import { useEffect, useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";

import { PERMISSION_COPY } from "@/lock";
import { Card, PillButton, Screen, useTheme } from "@/ui";

import { getNotificationModule } from "../accessor";
import { NOTIFICATION_TYPES, type NotificationTypeId } from "../model/catalog";
import type {
  NotificationAuthorizationStatus,
  NotificationModule,
} from "../NotificationModule";
import { useNotificationPreferencesStore } from "../store/notificationPreferencesStore";

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

export type NotificationSettingsCardProps = Readonly<{
  module?: NotificationModule;
  openSettings?: () => void;
}>;

/**
 * The ship-silent controls and their one permission flow.
 *
 * An OFF→ON gesture never mutates preferences before authorization succeeds.
 * The undecided state opens the benefit primer; denial leaves the type silent.
 */
export function NotificationSettingsCard({
  module = getNotificationModule(),
  openSettings = openSystemSettings,
}: NotificationSettingsCardProps = {}) {
  const { colors, spacing, typography } = useTheme();
  const enabled = useNotificationPreferencesStore((state) => state.enabled);
  const setEnabled = useNotificationPreferencesStore(
    (state) => state.setNotificationEnabled,
  );
  const [authorization, setAuthorization] =
    useState<NotificationAuthorizationStatus>("notDetermined");
  const [ready, setReady] = useState(false);
  const [pendingTypeId, setPendingTypeId] =
    useState<NotificationTypeId | null>(null);

  useEffect(() => {
    let mounted = true;
    void module.getAuthorizationStatus().then((status) => {
      if (mounted) {
        setAuthorization(status);
        setReady(true);
      }
    });
    return () => {
      mounted = false;
    };
  }, [module]);

  const handleToggle = (typeId: NotificationTypeId, on: boolean) => {
    if (!on) {
      setEnabled(typeId, false);
      return;
    }
    if (authorization === "approved") {
      setEnabled(typeId, true);
      return;
    }
    if (authorization === "notDetermined") {
      setPendingTypeId(typeId);
    }
  };

  const requestAuthorization = async () => {
    const status = await module.requestAuthorization();
    setAuthorization(status);
    if (status === "approved" && pendingTypeId !== null) {
      setEnabled(pendingTypeId, true);
    }
    setPendingTypeId(null);
  };

  const copy = STATUS_COPY[authorization];
  const sharedStatus = PERMISSION_COPY[authorization].statusLabel;
  const dotColor = {
    notDetermined: colors.textTertiary,
    approved: colors.success,
    denied: colors.danger,
  }[authorization];

  return (
    <>
      <Card testID="notification-settings-card" style={{ gap: spacing.lg }}>
        <View style={[styles.heading, { gap: spacing.md }]}>
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Text style={typography.cardTitle}>{copy.title}</Text>
            <Text style={typography.body}>{copy.body}</Text>
          </View>
          <View
            accessibilityLabel={`Notifications access: ${
              ready ? sharedStatus : "Checking"
            }`}
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

        {NOTIFICATION_TYPES.map((type) => (
          <View
            key={type.id}
            style={[styles.toggleRow, { gap: spacing.md }]}
          >
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text style={typography.cardTitle}>{type.settingsTitle}</Text>
              <Text style={typography.body}>{type.settingsDescription}</Text>
            </View>
            <View style={[styles.switch, { gap: spacing.xs }]}>
              <Switch
                testID={`notification-toggle-${type.id}`}
                accessibilityLabel={type.settingsTitle}
                disabled={!ready}
                value={enabled[type.id]}
                onValueChange={(on) => handleToggle(type.id, on)}
                trackColor={{
                  false: colors.pillSecondary,
                  true: colors.primary,
                }}
                ios_backgroundColor={colors.pillSecondary}
              />
              <Text style={typography.caption}>
                {enabled[type.id] ? "On" : "Off"}
              </Text>
            </View>
          </View>
        ))}
      </Card>

      {pendingTypeId === null ? null : (
        <View accessibilityViewIsModal style={StyleSheet.absoluteFill}>
          <Screen
            testID="notification-permission-primer"
            edges={["top", "left", "right", "bottom"]}
          >
            <View style={[styles.primer, { gap: spacing.lg, padding: spacing.gutter }]}>
              <View style={{ gap: spacing.md }}>
                <Text accessibilityRole="header" style={typography.sheetTitle}>
                  Choose what helps
                </Text>
                <Text style={typography.body}>
                  Turn on only the reminders that keep your screen-time payoff
                  within reach.
                </Text>
              </View>
              <View style={{ gap: spacing.sm }}>
                <PillButton
                  label="Allow notifications"
                  variant="white"
                  onPress={() => void requestAuthorization()}
                />
                <PillButton
                  label="Not now"
                  variant="secondary"
                  onPress={() => setPendingTypeId(null)}
                />
              </View>
            </View>
          </Screen>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  heading: {
    alignItems: "flex-start",
    flexDirection: "row",
  },
  primer: {
    flex: 1,
    justifyContent: "space-between",
  },
  status: {
    alignItems: "center",
    flexDirection: "row",
  },
  switch: {
    alignItems: "center",
  },
  toggleRow: {
    alignItems: "flex-start",
    flexDirection: "row",
  },
});
