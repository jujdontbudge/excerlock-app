import type { NotificationPermissionsStatus } from 'expo-notifications';
import { PermissionStatus } from '../../domain/types';

// expo-notifications' IosAuthorizationStatus, by value, so this file needs no native module.
const IOS_NOT_DETERMINED = 0;
const IOS_DENIED = 1;

/**
 * Reads the iOS authorization status first (authorized, provisional and ephemeral all deliver a
 * local notification), then falls back to the cross-platform field. iOS has no restricted state
 * for notifications, so the app's `restricted` never comes from here.
 */
export function toPermissionStatus(permissions: NotificationPermissionsStatus): PermissionStatus {
  const ios = permissions.ios?.status;
  if (ios === IOS_NOT_DETERMINED) return 'notDetermined';
  if (ios === IOS_DENIED) return 'denied';
  if (typeof ios === 'number') return 'granted';
  if (permissions.status === 'granted') return 'granted';
  return permissions.status === 'denied' ? 'denied' : 'notDetermined';
}
