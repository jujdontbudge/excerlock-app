import * as Notifications from "expo-notifications";

import type {
  DeliveryRecord,
  NotificationAuthorizationStatus,
  NotificationModule,
  NotificationUnsubscribe,
  ScheduledNotification,
  ScheduleListener,
} from "../NotificationModule";
import { assertValidScheduledNotification } from "../scheduledNotification";

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

  public async schedule(notification: ScheduledNotification): Promise<void> {
    assertValidScheduledNotification(notification);
    await Notifications.scheduleNotificationAsync({
      identifier: notification.id,
      content: {
        title: notification.content.title,
        body: notification.content.body,
        sound: "default",
        data: {
          url: notification.route,
          excerlockNotification: {
            version: 1,
            typeId: notification.typeId,
            deliverAtMs: notification.deliverAtMs,
          },
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(notification.deliverAtMs),
      },
    });
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
