import { LockedApps, LockDecision, PermissionStatus } from '../model/types';
import { Unsubscribe } from '../model/models';
import type { WatchdogRegistration } from './watchdog';
export type LockApplyResult = { applied: boolean; reason?: string };
export interface ScreenTimePort {
  selectionSummary(): { applicationCount: number; categoryCount: number; webDomainCount?: number } | null;
  authorizationStatus(): PermissionStatus;
  requestAuthorization(): Promise<PermissionStatus>;
  presentAppPicker(): Promise<LockedApps>;
  applyLock(decision: LockDecision): Promise<LockApplyResult>;
  registerWatchdog(plan: WatchdogRegistration): Promise<WatchdogRegistration>;
  cancelWatchdog(): Promise<void>;
  observeUsage(callback: (minutes: number | null) => void): Unsubscribe;
}
