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
 * Reconciles one ledger day into local schedules.
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
    const authorization = await this.module.getAuthorizationStatus();
    const plan =
      authorization === "approved"
        ? buildDayPlan({
            ...input,
            atMs: this.clock.nowMs(),
            deliveries: await this.module.getDeliveries(),
          })
        : [];
    const plannedIds = new Set(plan.map(({ id }) => id));

    for (const typeId of NOTIFICATION_TYPE_IDS) {
      const id = notificationScheduleId(typeId, input.day.dayIndex);
      if (!plannedIds.has(id)) {
        await this.module.cancel(id);
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
