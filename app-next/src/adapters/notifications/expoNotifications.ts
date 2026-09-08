import { requireOptionalNativeModule } from 'expo';
import { ExpoNotificationsModule, ExpoNotificationsPort, expoNotificationsAdapter } from './ExpoNotificationsAdapter';
import { paywallPresence } from './presentation';

/**
 * The production adapter, or null when the running binary has no expo-notifications native
 * module (a dev client built before the dependency was added), in which case the caller keeps
 * its fake. The JS module is required lazily for the same reason: its native bindings throw on
 * import when the module is absent.
 */
export function expoNotifications(): ExpoNotificationsPort | null {
  if (!requireOptionalNativeModule('ExpoNotificationScheduler')) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const module = require('expo-notifications') as ExpoNotificationsModule;
  return expoNotificationsAdapter(module, { paywallOpen: paywallPresence.isOpen });
}
