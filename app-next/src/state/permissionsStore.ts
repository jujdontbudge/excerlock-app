import { Permissions } from '../domain/types';
import { createPersistedStore } from './createPersistedStore';
import * as v from './validation';
export const emptyPermissions: Permissions = {
  screenTime: 'notDetermined',
  motion: 'notDetermined',
  location: 'notDetermined',
  health: 'notDetermined',
  camera: 'notDetermined',
  notifications: 'notDetermined',
};
export const permissionsStore = createPersistedStore<Permissions>('permissions', emptyPermissions, {
  screenTime: v.permission,
  motion: v.permission,
  health: v.permission,
  camera: v.permission,
  notifications: v.permission,
  location: v.oneOf(['notDetermined', 'whenInUse', 'always', 'denied']),
});
