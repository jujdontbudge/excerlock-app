import * as Notifications from "expo-notifications";
import type { StateStorage } from "zustand/middleware";

import { type NotificationClock, SystemNotificationClock } from "../clock";
import { settleDueNotifications } from "../deliveryHistory";
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
import { createNativeNotificationPersistence } from "./nativeNotificationStore";

type ExpoNotificationModuleOptions = Readonly<{
  clock?: NotificationClock;
  storage?: StateStorage<Promise<void>>;
}>;

export class ExpoNotificationModule implements NotificationModule {
  private readonly clock: NotificationClock;
  private readonly persistence: ReturnType<
    typeof createNativeNotificationPersistence
  >;
  private readonly ready: Promise<void>;

  public constructor(options: ExpoNotificationModuleOptions = {}) {
    this.clock = options.clock ?? new SystemNotificationClock();
    this.persistence = createNativeNotificationPersistence(options.storage);
    this.ready = this.persistence.rehydrate();
  }

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
    await this.ready;
    assertValidScheduledNotification(notification);
    const existing = (await this.getScheduled()).find(
      ({ id }) => id === notification.id,
    );
    if (
      existing !== undefined &&
      scheduledNotificationsEqual(existing, notification)
    ) {
      await this.rememberSchedule(notification);
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
    await this.rememberSchedule(notification);
  }

  public async cancel(id: string): Promise<void> {
    await this.ready;
    await Notifications.cancelScheduledNotificationAsync(id);
    const scheduled = this.persistence
      .getState()
      .scheduled.filter((notification) => notification.id !== id);
    await this.persistence.update({ scheduled });
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
    await this.ready;
    const state = this.persistence.getState();
    const settled = settleDueNotifications(
      state.scheduled,
      state.deliveries,
      this.clock.nowMs(),
    );
    if (settled.changed) {
      await this.persistence.update({
        scheduled: settled.scheduled,
        deliveries: settled.deliveries,
      });
    }
    return settled.deliveries.map((record) => Object.freeze({ ...record }));
  }

  public subscribe(_listener: ScheduleListener): NotificationUnsubscribe {
    return () => {};
  }

  private async rememberSchedule(
    notification: ScheduledNotification,
  ): Promise<void> {
    const state = this.persistence.getState();
    const scheduled = [
      ...state.scheduled.filter(({ id }) => id !== notification.id),
      freezeScheduledNotification(notification),
    ].sort(byDeliveryTime);
    await this.persistence.update({ scheduled });
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
