import { MockNotificationModule } from "./MockNotificationModule";
import type { NotificationModule } from "./NotificationModule";

let notificationModule: NotificationModule | undefined;

/**
 * The composition root for local notifications. Phase 3 changes only this
 * constructor to the native `expo-notifications` adapter.
 */
export function getNotificationModule(): NotificationModule {
  notificationModule ??= new MockNotificationModule();
  return notificationModule;
}
