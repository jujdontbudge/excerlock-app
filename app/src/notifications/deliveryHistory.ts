import { ROLLING_WINDOW_MS } from "./model/deliveryRules";
import type {
  DeliveryRecord,
  ScheduledNotification,
} from "./NotificationModule";

export type SettledDeliveries = Readonly<{
  scheduled: ScheduledNotification[];
  deliveries: DeliveryRecord[];
  changed: boolean;
}>;

export function settleDueNotifications(
  scheduledNotifications: readonly ScheduledNotification[],
  deliveryHistory: readonly DeliveryRecord[],
  nowMs: number,
): SettledDeliveries {
  const due = scheduledNotifications.filter(
    ({ deliverAtMs }) => deliverAtMs <= nowMs,
  );
  const scheduled = scheduledNotifications.filter(
    ({ deliverAtMs }) => deliverAtMs > nowMs,
  );
  const existingIds = new Set(deliveryHistory.map(({ id }) => id));
  const deliveries = [
    ...deliveryHistory,
    ...due
      .filter(({ id }) => !existingIds.has(id))
      .map(({ id, typeId, deliverAtMs }) => ({
        id,
        typeId,
        deliveredAtMs: deliverAtMs,
      })),
  ]
    .filter(({ deliveredAtMs }) => deliveredAtMs > nowMs - ROLLING_WINDOW_MS)
    .sort((left, right) => left.deliveredAtMs - right.deliveredAtMs);

  return {
    scheduled,
    deliveries,
    changed:
      due.length > 0 || deliveries.length !== deliveryHistory.length,
  };
}
