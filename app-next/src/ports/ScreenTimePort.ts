import { LockedApps, LockDecision, PermissionStatus } from '../domain/types';
import { Unsubscribe } from './models';
import type { WatchdogRegistration } from '../domain/watchdog';
export type LockApplyResult = { applied: boolean; reason?: string };
export interface ScreenTimePort {
  authorizationStatus(): PermissionStatus;
  requestAuthorization(): Promise<PermissionStatus>;
  presentAppPicker(): Promise<LockedApps>;
  applyLock(decision: LockDecision): Promise<LockApplyResult>;
  registerWatchdog(plan: WatchdogRegistration): Promise<WatchdogRegistration>;
  cancelWatchdog(): Promise<void>;
  observeUsage(callback: (minutes: number | null) => void): Unsubscribe;
}
