import * as Notifications from "expo-notifications";

import {
  NOTIFICATION_TYPE_IDS,
  getNotificationType,
  type NotificationTypeId,
} from "../model/catalog";
import type {
  DeliveryRecord,
  NotificationAuthorizationStatus,
  NotificationModule,
  NotificationUnsubscribe,
  ScheduledNotification,
  ScheduleListener,
} from "../NotificationModule";
import {
  assertValidScheduledNotification,
  byDeliveryTime,
  freezeScheduledNotification,
  scheduledNotificationsEqual,
} from "../scheduledNotification";

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
    const existing = (await this.getScheduled()).find(
      ({ id }) => id === notification.id,
    );
    if (
      existing !== undefined &&
      scheduledNotificationsEqual(existing, notification)
    ) {
      return;
    }

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

  public async cancel(id: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(id);
  }

  public async getScheduled(): Promise<readonly ScheduledNotification[]> {
    const requests = await Notifications.getAllScheduledNotificationsAsync();
    return requests
      .flatMap((request) => {
        const notification = scheduledNotification(request);
        return notification === null ? [] : [notification];
      })
      .sort(byDeliveryTime);
  }

  public async getDeliveries(): Promise<readonly DeliveryRecord[]> {
    return [];
  }

  public subscribe(_listener: ScheduleListener): NotificationUnsubscribe {
    return () => {};
  }
}

function scheduledNotification(
  request: Notifications.NotificationRequest,
): ScheduledNotification | null {
  const data = request.content.data;
  const metadata = data?.excerlockNotification;
  if (typeof metadata !== "object" || metadata === null) {
    return null;
  }

  const version = Reflect.get(metadata, "version");
  const typeId = Reflect.get(metadata, "typeId");
  const deliverAtMs = Reflect.get(metadata, "deliverAtMs");
  if (
    version !== 1 ||
    !isNotificationTypeId(typeId) ||
    !Number.isFinite(deliverAtMs) ||
    !request.identifier.startsWith(`${typeId}:`) ||
    request.content.title === null ||
    request.content.body === null ||
    data.url !== getNotificationType(typeId).route
  ) {
    return null;
  }

  return freezeScheduledNotification({
    id: request.identifier,
    typeId,
    content: {
      title: request.content.title,
      body: request.content.body,
    },
    route: getNotificationType(typeId).route,
    deliverAtMs,
  });
}

function isNotificationTypeId(value: unknown): value is NotificationTypeId {
  return (
    typeof value === "string" &&
    (NOTIFICATION_TYPE_IDS as readonly string[]).includes(value)
  );
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
