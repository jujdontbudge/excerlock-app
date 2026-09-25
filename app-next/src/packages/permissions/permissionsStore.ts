import { Permissions } from '../model/types';
import { createPersistedStore } from '../persistence/createPersistedStore';
import * as v from '../persistence/validation';
export const emptyPermissions: Permissions = {
  screenTime: 'notDetermined',
  motion: 'notDetermined',
  location: 'notDetermined',
  camera: 'notDetermined',
  notifications: 'notDetermined',
};
export const permissionsStore = createPersistedStore<Permissions>('permissions', emptyPermissions, {
  screenTime: v.permission,
  motion: v.permission,
  camera: v.permission,
  notifications: v.permission,
  location: v.oneOf(['notDetermined', 'whenInUse', 'always', 'denied']),
});
