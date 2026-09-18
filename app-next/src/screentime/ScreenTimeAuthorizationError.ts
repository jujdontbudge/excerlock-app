import type { PermissionStatus } from '../domain/types';

/** Screen Time is not granted, so the FamilyControls picker cannot be presented. */
export class ScreenTimeAuthorizationError extends Error {
  constructor(public readonly status: PermissionStatus) {
    super(
      status === 'denied'
        ? 'Screen Time access is off for ExcerLock'
        : 'Screen Time authorization is required before selection',
    );
    this.name = 'ScreenTimeAuthorizationError';
  }
}
