import { LockedApps, LockDecision, PermissionStatus } from '../domain/types';
import { MonitorPlan, monitorNameForLockWindow } from '../domain/monitorPlan';
import { Unsubscribe } from './models';

export { monitorNameForLockWindow };

// Why an apply could not be trusted. Every value fails closed: shields stay up.
export type ApplyFailureReason = 'monitorBudget' | 'screenTimeDenied' | 'noSelection' | 'adapter';

export type ApplyResult = {
  applied: boolean;
  shields: 'up' | 'down';
  monitors: number;
  reason?: ApplyFailureReason;
};

export interface ScreenTimePort {
  authorizationStatus(): PermissionStatus;
  requestAuthorization(): Promise<PermissionStatus>;
  presentAppPicker(): Promise<LockedApps>;
  describeSelection(): Promise<LockedApps>;
  applyLock(decision: LockDecision, plan: MonitorPlan): Promise<ApplyResult>;
  observeEnforcement(callback: (result: ApplyResult) => void): Unsubscribe;
  observeUsage(callback: (minutes: number | null) => void): Unsubscribe;
}
