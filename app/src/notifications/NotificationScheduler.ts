import { getNotificationModule } from "./accessor";
import {
  SystemNotificationClock,
  type NotificationClock,
} from "./clock";
import { NOTIFICATION_TYPE_IDS } from "./model/catalog";
import type {
  NotificationModule,
  ScheduledNotification,
} from "./NotificationModule";
import {
  buildDayPlan,
  notificationScheduleId,
  type NotificationPlanningInput,
} from "./planning/dayPlan";

export type NotificationSchedulerOptions = Readonly<{
  module?: NotificationModule;
  clock?: NotificationClock;
}>;

/**
 * Reconciles a ledger-day horizon into local schedules under shared caps.
 *
 * The caller supplies facts and persisted user choices; this class supplies
 * only two system boundaries. All trigger and delivery decisions remain local.
 */
export class NotificationScheduler {
  private readonly module: NotificationModule;
  private readonly clock: NotificationClock;

  public constructor(options: NotificationSchedulerOptions = {}) {
    this.module = options.module ?? getNotificationModule();
    this.clock = options.clock ?? new SystemNotificationClock();
  }

  public async reconcileDay(
    input: NotificationPlanningInput,
  ): Promise<readonly ScheduledNotification[]> {
    return this.reconcileDays([input]);
  }

  /** Atomically reconciles a local offline horizon under one rolling ceiling. */
  public async reconcileDays(
    inputs: readonly NotificationPlanningInput[],
  ): Promise<readonly ScheduledNotification[]> {
    const authorization = await this.module.getAuthorizationStatus();
    const delivered = await this.module.getDeliveries();
    const plan: ScheduledNotification[] = [];
    if (authorization === "approved") {
      for (const input of inputs) {
        const dayPlan = buildDayPlan({
          ...input,
          atMs: this.clock.nowMs(),
          deliveries: [
            ...delivered,
            ...plan.map(({ id, typeId, deliverAtMs }) => ({
              id,
              typeId,
              deliveredAtMs: deliverAtMs,
            })),
          ],
        });
        plan.push(...dayPlan);
      }
    }
    const plannedIds = new Set(plan.map(({ id }) => id));

    for (const input of inputs) {
      for (const typeId of NOTIFICATION_TYPE_IDS) {
        const id = notificationScheduleId(typeId, input.day.dayIndex);
        if (!plannedIds.has(id)) {
          await this.module.cancel(id);
        }
      }
    }
    for (const notification of plan) {
      await this.module.schedule(notification);
    }

    return plan;
  }
}

export { buildDayPlan } from "./planning/dayPlan";
export type { NotificationPlanningInput } from "./planning/dayPlan";
