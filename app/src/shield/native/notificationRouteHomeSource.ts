import type {
  IosAuthorizationStatus,
  NotificationPermissionsStatus,
} from "expo-notifications";

import type { ShieldRouteHomeSource } from "../ShieldContentCoordinator";

type PermissionSnapshot = Readonly<{
  granted: boolean;
  ios?: Readonly<{ status: IosAuthorizationStatus }>;
}>;

type PermissionReader = () => Promise<PermissionSnapshot | undefined>;

const ROUTABLE_IOS_AUTHORIZATIONS: ReadonlySet<IosAuthorizationStatus> = new Set([
  2,
  3,
  4,
]);

export function createNotificationRouteHomeSource(
  getPermissions: PermissionReader,
): ShieldRouteHomeSource {
  return {
    async available() {
      return getPermissions().then(
        (permissions) =>
          permissions?.granted === true ||
          (permissions?.ios !== undefined &&
            ROUTABLE_IOS_AUTHORIZATIONS.has(permissions.ios.status)),
        () => false,
      );
    },
  };
}

export const notificationRouteHomeSource =
  createNotificationRouteHomeSource(readNativePermissions);

/** Defers the native package until policy actually needs a permission read. */
function readNativePermissions(): Promise<NotificationPermissionsStatus> {
  return require("expo-notifications").getPermissionsAsync();
}
