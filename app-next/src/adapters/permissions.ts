import { Permissions, PermissionStatus } from '../domain/types';
import { permissionsStore } from '../state/permissionsStore';
import {
  HealthAuthorizationStatus,
  LocationAuthorizationStatus,
  MotionAuthStatus,
} from './engine/contracts';

/**
 * One place translates a platform authorization answer into the product's vocabulary and records
 * it. Settings and Home read `permissionsStore`, never the engine, so a status the user changed in
 * iOS Settings is visible the moment an adapter next asks (P2-T17 refreshes on foreground).
 */

export const motionPermission = (status: MotionAuthStatus): PermissionStatus =>
  status === 'authorized' ? 'granted' : status;

export const healthPermission = (status: HealthAuthorizationStatus): PermissionStatus =>
  status === 'authorized' ? 'granted' : status;

/**
 * `restricted` collapses to `denied`: a restricted device can never be granted, the product treats
 * the two identically, and P2-T15's `Permissions['location']` has no `restricted` member.
 */
export const locationPermission = (status: LocationAuthorizationStatus): Permissions['location'] => {
  if (status === 'authorizedAlways') return 'always';
  if (status === 'authorizedWhenInUse') return 'whenInUse';
  if (status === 'notDetermined') return 'notDetermined';
  return 'denied';
};

export function recordPermission<Key extends keyof Permissions>(
  key: Key,
  value: Permissions[Key],
): Permissions[Key] {
  if (permissionsStore.getState().data[key] !== value) {
    permissionsStore.getState().patch({ [key]: value } as Partial<Permissions>);
  }
  return value;
}

export const recordMotion = (status: MotionAuthStatus) =>
  recordPermission('motion', motionPermission(status));

export const recordHealth = (status: HealthAuthorizationStatus) =>
  recordPermission('health', healthPermission(status));

export const recordLocation = (status: LocationAuthorizationStatus) =>
  recordPermission('location', locationPermission(status));
