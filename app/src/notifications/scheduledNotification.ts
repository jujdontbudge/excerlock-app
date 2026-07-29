import type { ScheduledNotification } from "./NotificationModule";

export function assertValidScheduledNotification(
  notification: ScheduledNotification,
): void {
  if (
    notification.id.trim().length === 0 ||
    !Number.isFinite(notification.deliverAtMs) ||
    notification.content.title.trim().length === 0 ||
    notification.content.body.trim().length === 0
  ) {
    throw new Error(
      "Scheduled notification must have an id, content, and a finite delivery time",
    );
  }
}

export function byDeliveryTime(
  left: ScheduledNotification,
  right: ScheduledNotification,
): number {
  return (
    left.deliverAtMs - right.deliverAtMs || left.id.localeCompare(right.id)
  );
}

export function scheduledNotificationsEqual(
  left: ScheduledNotification,
  right: ScheduledNotification,
): boolean {
  return (
    left.id === right.id &&
    left.typeId === right.typeId &&
    left.route === right.route &&
    left.deliverAtMs === right.deliverAtMs &&
    left.content.title === right.content.title &&
    left.content.body === right.content.body
  );
}

export function freezeScheduledNotification(
  notification: ScheduledNotification,
): ScheduledNotification {
  return Object.freeze({
    ...notification,
    content: Object.freeze({ ...notification.content }),
  });
}
