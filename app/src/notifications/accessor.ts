import { MockNotificationModule } from "./MockNotificationModule";
import type { NotificationModule } from "./NotificationModule";

let notificationModule: NotificationModule | undefined;

/**
 * The composition root for local notifications: native in app bundles, mock in
 * Jest unless a test injects a module explicitly.
 */
export function getNotificationModule(): NotificationModule {
  notificationModule ??= createNotificationModule();
  return notificationModule;
}

function createNotificationModule(): NotificationModule {
  if (process.env.NODE_ENV === "test") {
    return new MockNotificationModule();
  }

  const { ExpoNotificationModule } = require(
    "./native/ExpoNotificationModule"
  ) as typeof import("./native/ExpoNotificationModule");
  return new ExpoNotificationModule();
}
