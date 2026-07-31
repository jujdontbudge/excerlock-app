import * as Notifications from "expo-notifications";

import type { ShieldRouteHomeSource } from "../ShieldContentCoordinator";

type PermissionSnapshot = Readonly<{
  granted: boolean;
  ios?: Readonly<{ status: Notifications.IosAuthorizationStatus }>;
}>;

type PermissionReader = () => Promise<PermissionSnapshot>;

const ROUTABLE_IOS_AUTHORIZATIONS = new Set([
  Notifications.IosAuthorizationStatus.AUTHORIZED,
  Notifications.IosAuthorizationStatus.PROVISIONAL,
  Notifications.IosAuthorizationStatus.EPHEMERAL,
]);

export function createNotificationRouteHomeSource(
  getPermissions: PermissionReader,
): ShieldRouteHomeSource {
  return {
    async available() {
      return getPermissions().then(
        (permissions) =>
          permissions.granted ||
          (permissions.ios !== undefined &&
            ROUTABLE_IOS_AUTHORIZATIONS.has(permissions.ios.status)),
        () => false,
      );
    },
  };
}

export const notificationRouteHomeSource =
  createNotificationRouteHomeSource(Notifications.getPermissionsAsync);
