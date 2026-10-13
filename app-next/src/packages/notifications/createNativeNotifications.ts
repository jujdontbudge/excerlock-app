import type { NotificationsPort } from '../ports/NotificationsPort';
import { permissionsStore } from '../permissions/permissionsStore';
import { expoLocalNotifications } from './ExpoLocalNotifications';
import { LocalNotifications } from './lib/LocalNotifications';
import { backgroundCheckPlan, openToUnlockPlan, trialReminderNotification } from './notificationPlan';
export function createNativeNotifications(isCurrent: () => boolean, generation: () => number = () => 0): NotificationsPort {
  const local = new LocalNotifications(expoLocalNotifications, isCurrent, generation);
  return {
    status: () => permissionsStore.getState().data.notifications,
    request: () => expoLocalNotifications.permission(true),
    scheduleTrialReminder: (at) => {
      const timestamp = Date.parse(at);
      if (!Number.isFinite(timestamp) || timestamp <= Date.now()) return Promise.reject(new Error('Trial reminder must be in the future'));
      return local.schedule(trialReminderNotification(timestamp));
    },
    scheduleOpenToUnlock: () => local.schedule(openToUnlockPlan({ now: Date.now(), alwaysDenied: true, targetMetWhileClosed: true })!),
    armBackgroundCheck: () => local.schedule(backgroundCheckPlan(Date.now())!),
    cancel: (id) => local.cancel(id),
  };
}
