import type * as Notifications from "expo-notifications";

import {
  getNotificationType,
  isNotificationTypeId,
  type NotificationRoute,
} from "../model/catalog";
import type { ScheduledNotification } from "../NotificationModule";
import { freezeScheduledNotification } from "../scheduledNotification";

const PAYLOAD_VERSION = 1;

export function toExpoNotificationRequest(
  notification: ScheduledNotification,
): Notifications.NotificationRequestInput {
  return {
    identifier: notification.id,
    content: {
      title: notification.content.title,
      body: notification.content.body,
      sound: "default",
      data: {
        url: notification.route,
        excerlockNotification: {
          version: PAYLOAD_VERSION,
          typeId: notification.typeId,
          deliverAtMs: notification.deliverAtMs,
        },
      },
    },
    trigger: {
      type: "date" as Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(notification.deliverAtMs),
    },
  };
}

export function fromExpoNotificationRequest(
  request: Notifications.NotificationRequest,
): ScheduledNotification | null {
  const route = scheduledNotificationDestination(
    request.identifier,
    request.content.data ?? {},
  );
  const metadata = request.content.data?.excerlockNotification;
  if (
    route === null ||
    typeof metadata !== "object" ||
    metadata === null ||
    Reflect.get(metadata, "version") !== PAYLOAD_VERSION ||
    !Number.isFinite(Reflect.get(metadata, "deliverAtMs")) ||
    request.content.title === null ||
    request.content.body === null
  ) {
    return null;
  }

  const typeId = Reflect.get(metadata, "typeId");
  if (!isNotificationTypeId(typeId)) return null;

  return freezeScheduledNotification({
    id: request.identifier,
    typeId,
    content: {
      title: request.content.title,
      body: request.content.body,
    },
    route,
    deliverAtMs: Reflect.get(metadata, "deliverAtMs"),
  });
}

export function scheduledNotificationDestination(
  identifier: string,
  data: Readonly<Record<string, unknown>>,
): NotificationRoute | null {
  const metadata = data.excerlockNotification;
  const [typeId, dayIndex, extra] = identifier.split(":");
  if (
    extra !== undefined ||
    !isNotificationTypeId(typeId) ||
    dayIndex === undefined ||
    !Number.isInteger(Number(dayIndex)) ||
    typeof metadata !== "object" ||
    metadata === null ||
    Reflect.get(metadata, "version") !== PAYLOAD_VERSION ||
    Reflect.get(metadata, "typeId") !== typeId
  ) {
    return null;
  }

  const route = getNotificationType(typeId).route;
  return data.url === route ? route : null;
}
