import { LockedApps, LockDecision, PermissionStatus } from '../domain/types';
import { Unsubscribe } from './models';
import { ApplyResult, EnforcementPlan } from '../runtime/upstreamCompatibility';
export interface ScreenTimePort {
  authorizationStatus(): PermissionStatus;
  requestAuthorization(): Promise<PermissionStatus>;
  presentAppPicker(): Promise<LockedApps>;
  // merge: P2-T14 owns ApplyResult, EnforcementPlan and this final port shape.
  applyLock(decision: LockDecision, plan: EnforcementPlan): Promise<ApplyResult>;
  describeSelection(): Promise<LockedApps>;
  observeUsage(callback: (minutes: number | null) => void): Unsubscribe;
}
