import * as Notifications from 'expo-notifications';
import type { NotificationResponse, NotificationResponsesPort } from '../ports/NotificationResponsesPort';

const mapResponse = (response: Notifications.NotificationResponse): NotificationResponse => ({
  id: response.notification.request.identifier,
  receivedAt: response.notification.date,
  action: response.actionIdentifier,
  url: response.notification.request.content.data?.url,
});

export const expoNotificationResponses: NotificationResponsesPort = {
  async last() {
    const response = await Notifications.getLastNotificationResponseAsync();
    return response ? mapResponse(response) : null;
  },
  subscribe(receive) {
    const listener = Notifications.addNotificationResponseReceivedListener((response) => receive(mapResponse(response)));
    return () => listener.remove();
  },
  clear: () => Notifications.clearLastNotificationResponseAsync(),
};
