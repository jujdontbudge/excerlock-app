import type * as ExpoNotifications from 'expo-notifications';
import { notificationCopy } from '../../content/notifications';
import { PermissionStatus } from '../../domain/types';
import { Unsubscribe } from '../../ports/models';
import { NotificationsPort } from '../../ports/NotificationsPort';
import { permissionsStore } from '../../state/permissionsStore';
import { TRIAL_REMINDER_ID, WALK_LEASE_WARNING_ID } from './catalog';
import { NOTIFICATION_LANDING } from './landing';
import { toPermissionStatus } from './permissionStatus';
import { foregroundBehavior } from './presentation';

/** The slice of expo-notifications the adapter touches. Nothing here can obtain a push token. */
export type ExpoNotificationsModule = Pick<
  typeof ExpoNotifications,
  | 'getPermissionsAsync'
  | 'requestPermissionsAsync'
  | 'scheduleNotificationAsync'
  | 'cancelScheduledNotificationAsync'
  | 'getAllScheduledNotificationsAsync'
  | 'setNotificationHandler'
  | 'addNotificationResponseReceivedListener'
  | 'getLastNotificationResponse'
  | 'clearLastNotificationResponse'
>;

export type NotificationResponse = { identifier: string };
/** Where taps come from: the response that launched the app, then every later one. */
export type NotificationResponseSource = {
  last(): NotificationResponse | null;
  clear(): void;
  subscribe(listener: (response: NotificationResponse) => void): Unsubscribe;
};

export type ExpoNotificationsPort = NotificationsPort & {
  responses: NotificationResponseSource;
  /** Re-reads the OS permission and records it for Settings. */
  refreshStatus(): Promise<PermissionStatus>;
};

const DATE_TRIGGER = 'date' as ExpoNotifications.SchedulableTriggerInputTypes.DATE;

/**
 * `NotificationsPort` over expo-notifications' local scheduling.
 *
 * - Permission: `status()` answers from the last known value synchronously (the port is sync, the
 *   OS read is not) and refreshes in the background, recording a change on the permissions store,
 *   which Settings shows as "Reminders". `request()` is the only prompt and it asks for alerts and
 *   sound, never a badge.
 * - Scheduling: fixed identifiers per kind, so a second schedule replaces the pending request and
 *   a cancel after a restart still finds it. Content carries the landing route as data.
 * - Foreground: one `setNotificationHandler` applying `foregroundBehavior`.
 */
export function expoNotificationsAdapter(
  module: ExpoNotificationsModule,
  options: { paywallOpen?: () => boolean } = {},
): ExpoNotificationsPort {
  let cached: PermissionStatus = permissionsStore.getState().data.notifications;
  let refreshing: Promise<PermissionStatus> | null = null;
  const record = (status: PermissionStatus) => {
    cached = status;
    if (permissionsStore.getState().data.notifications !== status) permissionsStore.getState().patch({ notifications: status });
    return status;
  };
  const refreshStatus = () =>
    (refreshing ??= module
      .getPermissionsAsync()
      .then((permissions) => record(toPermissionStatus(permissions)))
      .finally(() => {
        refreshing = null;
      }));
  const schedule = (identifier: string, title: string, body: string, at: string) =>
    module.scheduleNotificationAsync({
      identifier,
      content: {
        title,
        body,
        sound: 'default',
        data: { route: identifier === TRIAL_REMINDER_ID ? NOTIFICATION_LANDING.trialReminder : NOTIFICATION_LANDING.walkLeaseWarning },
      },
      trigger: { type: DATE_TRIGGER, date: new Date(at) },
    });

  module.setNotificationHandler({
    handleNotification: async (notification) =>
      foregroundBehavior(notification.request.identifier, { paywallOpen: options.paywallOpen?.() ?? false }),
  });
  void refreshStatus().catch(() => cached);

  return {
    status: () => {
      void refreshStatus().catch(() => cached);
      return cached;
    },
    request: async () =>
      record(
        toPermissionStatus(
          await module.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } }),
        ),
      ),
    refreshStatus,
    scheduleTrialReminder: (at, daysBefore = 1) =>
      schedule(TRIAL_REMINDER_ID, notificationCopy.trial.title(daysBefore), notificationCopy.trial.body, at),
    scheduleWalkLeaseWarning: (at, variant = 'handheld') =>
      schedule(WALK_LEASE_WARNING_ID, notificationCopy.lease[variant].title, notificationCopy.lease[variant].body, at),
    cancel: (id) => module.cancelScheduledNotificationAsync(id),
    pending: async () =>
      (await module.getAllScheduledNotificationsAsync()).map((request) => ({
        id: request.identifier,
        at: triggerInstant(request.trigger),
      })),
    responses: {
      last: () => {
        const response = module.getLastNotificationResponse();
        return response ? { identifier: response.notification.request.identifier } : null;
      },
      clear: () => module.clearLastNotificationResponse(),
      subscribe: (listener) => {
        const subscription = module.addNotificationResponseReceivedListener((response) =>
          listener({ identifier: response.notification.request.identifier }),
        );
        return () => subscription.remove();
      },
    },
  };
}

/**
 * The instant a scheduled request will fire, as an ISO string.
 *
 * `NotificationTrigger` is a union of everything the platform can schedule, and only some members
 * carry an instant at all. iOS reports the app's own `date` back for a date trigger; the epoch-second
 * form some platforms use is widened here so the developer menu never shows a 1970 timestamp.
 */
function triggerInstant(trigger: unknown): string | null {
  const source = trigger as { date?: Date | number; value?: number } | null;
  const raw = source?.date ?? source?.value;
  if (raw === undefined || raw === null) return null;
  const ms = raw instanceof Date ? raw.getTime() : Number(raw);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms < 1e11 ? ms * 1_000 : ms).toISOString();
}
