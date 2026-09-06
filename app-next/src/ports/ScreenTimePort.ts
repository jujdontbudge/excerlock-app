import { LockedApps, LockDecision, PermissionStatus } from '../domain/types';
import { Unsubscribe } from './models';
export interface ScreenTimePort {
  authorizationStatus(): PermissionStatus;
  requestAuthorization(): Promise<PermissionStatus>;
  presentAppPicker(): Promise<LockedApps>;
  applyLock(decision: LockDecision): void;
  observeUsage(callback: (minutes: number | null) => void): Unsubscribe;
}
