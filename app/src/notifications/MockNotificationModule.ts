import type { StateStorage } from "zustand/middleware";

import {
  SystemNotificationClock,
  type CancelScheduledNotificationTask,
  type NotificationClock,
} from "./clock";
import { settleDueNotifications } from "./deliveryHistory";
import { createMockNotificationPersistence } from "./mockStore";
import type {
  DeliveryRecord,
  NotificationAuthorizationStatus,
  NotificationModule,
  NotificationUnsubscribe,
  ScheduledNotification,
  ScheduleListener,
} from "./NotificationModule";
import {
  assertValidScheduledNotification,
  byDeliveryTime,
  freezeScheduledNotification,
  scheduledNotificationsEqual,
} from "./scheduledNotification";

type AuthorizationDecision = Exclude<
  NotificationAuthorizationStatus,
  "notDetermined"
>;

type MockNotificationModuleOptions = Readonly<{
  clock?: NotificationClock;
  storage?: StateStorage<Promise<void>>;
}>;

export class MockNotificationModule implements NotificationModule {
  private readonly clock: NotificationClock;
  private readonly persistence: ReturnType<
    typeof createMockNotificationPersistence
  >;
  private readonly ready: Promise<void>;
  private nextAuthorizationResult: AuthorizationDecision = "approved";
  private scheduledClockTasks: CancelScheduledNotificationTask[] = [];
  private readonly listeners = new Set<ScheduleListener>();
  private deliveryWork = Promise.resolve();

  public constructor(options: MockNotificationModuleOptions = {}) {
    this.clock = options.clock ?? new SystemNotificationClock();
    this.persistence = createMockNotificationPersistence(options.storage);
    this.ready = this.persistence.rehydrate().then(async () => {
      await this.deliverDueNotifications();
      this.armDeliveryTimes();
    });
  }

  public async getAuthorizationStatus(): Promise<NotificationAuthorizationStatus> {
    await this.ready;
    return this.persistence.getState().authorizationStatus;
  }

  public async requestAuthorization(): Promise<NotificationAuthorizationStatus> {
    await this.ready;
    if (this.persistence.getState().authorizationStatus === "notDetermined") {
      await this.persistence.update({
        authorizationStatus: this.nextAuthorizationResult,
      });
    }
    return this.persistence.getState().authorizationStatus;
  }

  public async schedule(notification: ScheduledNotification): Promise<void> {
    await this.ready;
    await this.deliveryWork;
    if (this.persistence.getState().authorizationStatus !== "approved") {
      throw new Error("Notification authorization is required before scheduling");
    }
    assertValidScheduledNotification(notification);

    const state = this.persistence.getState();
    if (state.deliveries.some(({ id }) => id === notification.id)) {
      return;
    }
    const existing = state.scheduled.find(({ id }) => id === notification.id);
    if (
      existing !== undefined &&
      scheduledNotificationsEqual(existing, notification)
    ) {
      return;
    }

    const scheduled = [
      ...state.scheduled.filter(({ id }) => id !== notification.id),
      freezeScheduledNotification(notification),
    ].sort(byDeliveryTime);
    await this.persistence.update({ scheduled });
    await this.deliverDueNotifications();
    this.armDeliveryTimes();
    this.emit();
  }

  public async cancel(id: string): Promise<void> {
    await this.ready;
    await this.deliveryWork;
    const scheduled = this.persistence
      .getState()
      .scheduled.filter((notification) => notification.id !== id);
    if (scheduled.length === this.persistence.getState().scheduled.length) {
      return;
    }
    await this.persistence.update({ scheduled });
    this.armDeliveryTimes();
    this.emit();
  }

  public async getScheduled(): Promise<readonly ScheduledNotification[]> {
    await this.ready;
    await this.deliveryWork;
    return this.scheduledSnapshot();
  }

  public async getDeliveries(): Promise<readonly DeliveryRecord[]> {
    await this.ready;
    await this.deliveryWork;
    const changed = await this.deliverDueNotifications();
    if (changed) {
      this.armDeliveryTimes();
      this.emit();
    }
    return this.persistence
      .getState()
      .deliveries.map((record) => Object.freeze({ ...record }));
  }

  public subscribe(listener: ScheduleListener): NotificationUnsubscribe {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Deterministic mock driver; not part of the app-facing interface. */
  public setNextAuthorizationResult(result: AuthorizationDecision): void {
    this.nextAuthorizationResult = result;
  }

  private queueDeliveryRefresh(): void {
    this.deliveryWork = this.deliveryWork.then(async () => {
      const changed = await this.deliverDueNotifications();
      this.armDeliveryTimes();
      if (changed) {
        this.emit();
      }
    });
  }

  private async deliverDueNotifications(): Promise<boolean> {
    const nowMs = this.clock.nowMs();
    const state = this.persistence.getState();
    const settled = settleDueNotifications(
      state.scheduled,
      state.deliveries,
      nowMs,
    );
    if (settled.changed) {
      await this.persistence.update({
        scheduled: settled.scheduled,
        deliveries: settled.deliveries,
      });
    }
    return settled.changed;
  }

  private armDeliveryTimes(): void {
    this.scheduledClockTasks.forEach((cancel) => cancel());
    this.scheduledClockTasks = [];
    const nowMs = this.clock.nowMs();
    const times = new Set(
      this.persistence
        .getState()
        .scheduled.map(({ deliverAtMs }) => deliverAtMs)
        .filter((deliverAtMs) => deliverAtMs > nowMs),
    );
    times.forEach((deliverAtMs) => {
      this.scheduledClockTasks.push(
        this.clock.scheduleAt(deliverAtMs, () => this.queueDeliveryRefresh()),
      );
    });
  }

  private scheduledSnapshot(): readonly ScheduledNotification[] {
    return this.persistence
      .getState()
      .scheduled.map((notification) =>
        freezeScheduledNotification(notification),
      );
  }

  private emit(): void {
    const scheduled = this.scheduledSnapshot();
    this.listeners.forEach((listener) => listener(scheduled));
  }

}
