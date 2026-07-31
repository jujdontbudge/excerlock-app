import * as Notifications from "expo-notifications";

import type {
  ShieldNotificationResponse,
  ShieldNotificationResponseSource,
} from "./ShieldNotificationResponseHost";

function toShieldResponse(
  response: Notifications.NotificationResponse,
): ShieldNotificationResponse {
  return {
    identifier: response.notification.request.identifier,
    data: response.notification.request.content.data ?? {},
  };
}

export const expoShieldNotificationResponseSource: ShieldNotificationResponseSource = {
  clearLastResponse() {
    Notifications.clearLastNotificationResponse();
  },
  getLastResponse() {
    const response = Notifications.getLastNotificationResponse();
    return response === null ? null : toShieldResponse(response);
  },
  subscribe(listener) {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => listener(toShieldResponse(response)),
    );
    return () => subscription.remove();
  },
};
