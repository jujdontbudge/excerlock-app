import { openSettings as openSystemSettings } from "expo-linking";

import { Card, useTheme } from "@/ui";

import { getNotificationModule } from "../accessor";
import { useNotificationPermission } from "../hooks/useNotificationPermission";
import { NOTIFICATION_TYPES, type NotificationTypeId } from "../model/catalog";
import type { NotificationModule } from "../NotificationModule";
import { useNotificationPreferencesStore } from "../store/notificationPreferencesStore";
import { AfternoonNudgeTimePicker } from "./AfternoonNudgeTimePicker";
import { NotificationPermissionPrimer } from "./NotificationPermissionPrimer";
import { NotificationPermissionStatus } from "./NotificationPermissionStatus";
import { NotificationToggleRow } from "./NotificationToggleRow";

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
  const { spacing } = useTheme();
  const enabled = useNotificationPreferencesStore((state) => state.enabled);
  const setEnabled = useNotificationPreferencesStore(
    (state) => state.setNotificationEnabled,
  );
  const permission = useNotificationPermission(module, (typeId) =>
    setEnabled(typeId, true),
  );

  const handleToggle = (typeId: NotificationTypeId, on: boolean) => {
    if (on) {
      permission.beginOptIn(typeId);
    } else {
      setEnabled(typeId, false);
    }
  };

  return (
    <>
      <Card testID="notification-settings-card" style={{ gap: spacing.lg }}>
        <NotificationPermissionStatus
          authorization={permission.authorization}
          ready={permission.ready}
          openSettings={openSettings}
        />
        {NOTIFICATION_TYPES.map((type) => (
          <NotificationToggleRow
            key={type.id}
            type={type}
            enabled={enabled[type.id]}
            disabled={!permission.ready}
            onChange={(on) => handleToggle(type.id, on)}
          />
        ))}
        <AfternoonNudgeTimePicker />
      </Card>
      <NotificationPermissionPrimer
        visible={permission.primerVisible}
        onAllow={() => void permission.requestAuthorization()}
        onClose={permission.cancelPrimer}
      />
    </>
  );
}
