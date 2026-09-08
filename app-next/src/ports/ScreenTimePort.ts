import { LockedApps, LockDecision, PermissionStatus } from '../domain/types';
import { EnforcementPlan } from '../domain/enforcement';
import { MonitorPlan, monitorNameForLockWindow } from '../domain/monitorPlan';
import { Unsubscribe } from './models';

export { monitorNameForLockWindow };

// Why an apply could not be trusted. Every value fails closed: shields stay up.
export type ApplyFailureReason = 'monitorBudget' | 'monitorRegistration' | 'screenTimeDenied' | 'noSelection' | 'adapter';

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
  /**
   * `plan` is the policy — whether to shield and whether to keep the monitors — and `monitors` is the
   * absolute window plan to register. The policy is separate because a lapsed entitlement clears the
   * shields whatever the decision says.
   */
  applyLock(decision: LockDecision, plan: EnforcementPlan, monitors: MonitorPlan): Promise<ApplyResult>;
  observeEnforcement(callback: (result: ApplyResult) => void): Unsubscribe;
  observeUsage(callback: (minutes: number | null) => void): Unsubscribe;
}
