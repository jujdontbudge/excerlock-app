import type * as ExpoNotifications from 'expo-notifications';
import { ExpoNotificationsModule } from '../ExpoNotificationsAdapter';

type Permissions = ExpoNotifications.NotificationPermissionsStatus;
type Request = ExpoNotifications.NotificationRequestInput;

export const iosPermissions = (status: number): Permissions =>
  ({
    status: status === 1 ? 'denied' : status === 0 ? 'undetermined' : 'granted',
    granted: status >= 2,
    canAskAgain: status === 0,
    expires: 'never',
    ios: { status },
  }) as unknown as Permissions;

/**
 * An in-memory stand-in for the slice of expo-notifications the adapter uses. Pending requests are
 * keyed by identifier, the way UNUserNotificationCenter replaces a request with the same id.
 */
export function fakeExpoNotifications(initial: Permissions = iosPermissions(0)) {
  let permissions = initial;
  let onRequest: Permissions = iosPermissions(2);
  let handler: ExpoNotifications.NotificationHandler | null = null;
  let lastResponse: ExpoNotifications.NotificationResponse | null = null;
  const pending = new Map<string, Request>();
  const listeners = new Set<(response: ExpoNotifications.NotificationResponse) => void>();
  const response = (identifier: string): ExpoNotifications.NotificationResponse =>
    ({ actionIdentifier: 'default', notification: { date: 0, request: { identifier, content: {}, trigger: null } } }) as never;
  const module: ExpoNotificationsModule = {
    getPermissionsAsync: async () => permissions,
    requestPermissionsAsync: async () => (permissions = onRequest),
    scheduleNotificationAsync: async (request) => {
      const identifier = request.identifier ?? `generated-${pending.size + 1}`;
      pending.set(identifier, request);
      return identifier;
    },
    cancelScheduledNotificationAsync: async (identifier) => {
      pending.delete(identifier);
    },
    getAllScheduledNotificationsAsync: async () =>
      [...pending.entries()].map(([identifier, request]) => ({
        identifier,
        content: request.content,
        trigger: request.trigger,
      })) as never,
    setNotificationHandler: (next) => {
      handler = next;
    },
    addNotificationResponseReceivedListener: (listener) => {
      listeners.add(listener);
      return { remove: () => listeners.delete(listener) } as never;
    },
    getLastNotificationResponse: () => lastResponse,
    clearLastNotificationResponse: () => {
      lastResponse = null;
    },
  };
  return {
    module,
    pending,
    setPermissions: (next: Permissions) => {
      permissions = next;
    },
    answerRequestWith: (next: Permissions) => {
      onRequest = next;
    },
    present: (identifier: string) =>
      handler!.handleNotification({ date: 0, request: { identifier, content: {}, trigger: null } } as never),
    launchWith: (identifier: string) => {
      lastResponse = response(identifier);
    },
    tap: (identifier: string) => listeners.forEach((listener) => listener(response(identifier))),
    lastResponse: () => lastResponse,
  };
}
