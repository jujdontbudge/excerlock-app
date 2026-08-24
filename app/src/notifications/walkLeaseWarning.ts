import * as Notifications from "expo-notifications";

export const WALK_LEASE_WARNING_ID =
  "excerlock.walk-lease-warning.v1";
export const WALK_LEASE_WARNING_LEAD_MS = 30_000;

export interface WalkLeaseWarningNotifier {
  schedule(leaseEndsAtMs: number): Promise<void>;
  cancel(): Promise<void>;
}

/** Operational session warning; it never prompts or appears in Settings. */
export class ExpoWalkLeaseWarningNotifier
  implements WalkLeaseWarningNotifier
{
  public async schedule(leaseEndsAtMs: number): Promise<void> {
    await this.cancel();
    const permissions = await Notifications.getPermissionsAsync();
    if (!notificationPermissionIsApproved(permissions)) {
      return;
    }
    await Notifications.scheduleNotificationAsync({
      identifier: WALK_LEASE_WARNING_ID,
      content: {
        title: "Your walk check is almost due",
        body: "Pick up your phone to keep apps open, or return to ExcerLock for a quick scan.",
        sound: "default",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(leaseEndsAtMs - WALK_LEASE_WARNING_LEAD_MS),
      },
    });
  }

  public async cancel(): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(
      WALK_LEASE_WARNING_ID,
    );
  }
}

function notificationPermissionIsApproved(
  permissions: Notifications.NotificationPermissionsStatus,
): boolean {
  switch (permissions.ios?.status) {
    case Notifications.IosAuthorizationStatus.AUTHORIZED:
    case Notifications.IosAuthorizationStatus.PROVISIONAL:
    case Notifications.IosAuthorizationStatus.EPHEMERAL:
      return true;
    case Notifications.IosAuthorizationStatus.DENIED:
    case Notifications.IosAuthorizationStatus.NOT_DETERMINED:
      return false;
  }
  return permissions.status === Notifications.PermissionStatus.GRANTED;
}
