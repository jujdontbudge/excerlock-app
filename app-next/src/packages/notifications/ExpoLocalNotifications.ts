import * as Notifications from 'expo-notifications';
import type { LocalNotificationsBackend } from './lib/LocalNotifications';
import type { PermissionStatus } from '../model/types';
import { permissionsStore } from '../permissions/permissionsStore';

export const expoLocalNotifications: LocalNotificationsBackend = {
  async permission(request) {
    const result = request
      ? await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: false, allowSound: true } })
      : await Notifications.getPermissionsAsync();
    const status: PermissionStatus = result.granted || result.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
      ? 'granted' : result.status === 'undetermined' ? 'notDetermined' : 'denied';
    permissionsStore.getState().patch({ notifications: status });
    return status;
  },
  schedule(plan) {
    return Notifications.scheduleNotificationAsync({
      identifier: plan.id,
      content: { title: plan.title, body: plan.body, data: { url: plan.url }, sound: 'default' },
      trigger: plan.at <= Date.now() ? null : { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(plan.at) },
    });
  },
  cancel: (id) => Notifications.cancelScheduledNotificationAsync(id),
};
