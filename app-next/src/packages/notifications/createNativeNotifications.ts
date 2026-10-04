import type { NotificationsPort } from '../ports/NotificationsPort';
import { permissionsStore } from '../permissions/permissionsStore';
import { expoLocalNotifications } from './ExpoLocalNotifications';
import { LocalNotifications } from './lib/LocalNotifications';
import { openToUnlockPlan, proppedWarningPlan } from './notificationPlan';
export function createNativeNotifications(
  isCurrent: () => boolean,
  generation: () => number = () => 0,
): NotificationsPort {
  const local = new LocalNotifications(expoLocalNotifications, isCurrent, generation);
  return {
    status: () => permissionsStore.getState().data.notifications,
    request: () => expoLocalNotifications.permission(true),
    scheduleTrialReminder: (at) => {
      const timestamp = Date.parse(at);
      if (!Number.isFinite(timestamp) || timestamp <= Date.now())
        return Promise.reject(new Error('Trial reminder must be in the future'));
      return local.schedule({
        id: 'trial_ending',
        at: timestamp,
        title: 'Your trial ends in two days',
        body: 'Review your ExcerLock subscription before your trial ends.',
        url: 'excerlock://paywall',
      });
    },
    scheduleProppedWarning: (at) => {
      const plan = proppedWarningPlan(Date.parse(at) + 30_000, Date.now());
      return plan ? local.schedule(plan) : Promise.reject(new Error('Propped warning must be in the future'));
    },
    scheduleOpenToUnlock: () =>
      local.schedule(openToUnlockPlan({ now: Date.now(), alwaysDenied: true, targetMetWhileClosed: true })!),
    cancel: (id) => local.cancel(id),
  };
}
