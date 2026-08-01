import { getNotificationType, isNotificationTypeId } from "./model/catalog";
import type {
  DeliveryRecord,
  ScheduledNotification,
} from "./NotificationModule";

/** Decodes the shared persisted notification records at the storage boundary. */
export function readScheduledNotifications(
  value: unknown,
): ScheduledNotification[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((candidate) => {
    if (typeof candidate !== "object" || candidate === null) return [];
    const id = Reflect.get(candidate, "id");
    const typeId = Reflect.get(candidate, "typeId");
    const content = Reflect.get(candidate, "content");
    const route = Reflect.get(candidate, "route");
    const deliverAtMs = Reflect.get(candidate, "deliverAtMs");
    if (
      typeof id !== "string" ||
      id.trim().length === 0 ||
      !isNotificationTypeId(typeId) ||
      typeof content !== "object" ||
      content === null ||
      typeof Reflect.get(content, "title") !== "string" ||
      typeof Reflect.get(content, "body") !== "string" ||
      route !== getNotificationType(typeId).route ||
      !Number.isFinite(deliverAtMs)
    ) {
      return [];
    }
    return [{ id, typeId, content, route, deliverAtMs }];
  });
}

export function readDeliveryRecords(value: unknown): DeliveryRecord[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((candidate) => {
    if (typeof candidate !== "object" || candidate === null) return [];
    const id = Reflect.get(candidate, "id");
    const typeId = Reflect.get(candidate, "typeId");
    const deliveredAtMs = Reflect.get(candidate, "deliveredAtMs");
    return typeof id === "string" &&
      id.trim().length > 0 &&
      isNotificationTypeId(typeId) &&
      Number.isFinite(deliveredAtMs)
      ? [{ id, typeId, deliveredAtMs }]
      : [];
  });
}
