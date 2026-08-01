import * as Notifications from "expo-notifications";
import type { StateStorage } from "zustand/middleware";

import { type NotificationClock, SystemNotificationClock } from "../clock";
import { settleDueNotifications } from "../deliveryHistory";
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
import { configureNotificationPresentation } from "./configureNotificationPresentation";
import {
  fromExpoNotificationRequest,
  toExpoNotificationRequest,
} from "./expoNotificationCodec";
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
  private readonly listeners = new Set<ScheduleListener>();

  public constructor(options: ExpoNotificationModuleOptions = {}) {
    configureNotificationPresentation();
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

    await Notifications.scheduleNotificationAsync(
      toExpoNotificationRequest(notification),
    );
    await this.rememberSchedule(notification);
    this.emit();
  }

  public async cancel(id: string): Promise<void> {
    await this.ready;
    await Notifications.cancelScheduledNotificationAsync(id);
    const scheduled = this.persistence
      .getState()
      .scheduled.filter((notification) => notification.id !== id);
    const changed =
      scheduled.length !== this.persistence.getState().scheduled.length;
    await this.persistence.update({ scheduled });
    if (changed) this.emit();
  }

  public async getScheduled(): Promise<readonly ScheduledNotification[]> {
    const requests = await Notifications.getAllScheduledNotificationsAsync();
    return requests
      .flatMap((request) => {
        const notification = fromExpoNotificationRequest(request);
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

  public subscribe(listener: ScheduleListener): NotificationUnsubscribe {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
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

  private emit(): void {
    const scheduled = this.persistence
      .getState()
      .scheduled.map((notification) => freezeScheduledNotification(notification));
    this.listeners.forEach((listener) => listener(scheduled));
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
