import * as Notifications from "expo-notifications";

import type {
  DeliveryRecord,
  NotificationAuthorizationStatus,
  NotificationModule,
  NotificationUnsubscribe,
  ScheduledNotification,
  ScheduleListener,
} from "../NotificationModule";

export class ExpoNotificationModule implements NotificationModule {
  public async getAuthorizationStatus(): Promise<NotificationAuthorizationStatus> {
    return authorizationStatus(await Notifications.getPermissionsAsync());
  }

  public async requestAuthorization(): Promise<NotificationAuthorizationStatus> {
    const permissions = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: false,
        allowSound: true,
      },
    });
    return authorizationStatus(permissions);
  }

  public async schedule(_notification: ScheduledNotification): Promise<void> {
    throw new Error("Native notification scheduling is not implemented");
  }

  public async cancel(_id: string): Promise<void> {}

  public async getScheduled(): Promise<readonly ScheduledNotification[]> {
    return [];
  }

  public async getDeliveries(): Promise<readonly DeliveryRecord[]> {
    return [];
  }

  public subscribe(_listener: ScheduleListener): NotificationUnsubscribe {
    return () => {};
  }
}

function authorizationStatus(
  permissions: Notifications.NotificationPermissionsStatus,
): NotificationAuthorizationStatus {
  switch (permissions.ios?.status) {
    case Notifications.IosAuthorizationStatus.AUTHORIZED:
    case Notifications.IosAuthorizationStatus.PROVISIONAL:
    case Notifications.IosAuthorizationStatus.EPHEMERAL:
      return "approved";
    case Notifications.IosAuthorizationStatus.DENIED:
      return "denied";
    case Notifications.IosAuthorizationStatus.NOT_DETERMINED:
      return "notDetermined";
  }

  switch (permissions.status) {
    case Notifications.PermissionStatus.GRANTED:
      return "approved";
    case Notifications.PermissionStatus.DENIED:
      return "denied";
    case Notifications.PermissionStatus.UNDETERMINED:
      return "notDetermined";
  }
}
