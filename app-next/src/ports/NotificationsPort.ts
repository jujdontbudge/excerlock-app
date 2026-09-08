import { PermissionStatus } from '../domain/types';

// B14 (amended by B30): two user-facing local notifications, both scheduled through this port,
// plus the shield tap-through id. ShieldAction is the only writer of the third id — nothing on
// this port schedules it, and the app only ever reads or cancels it.
export const SHIELD_OPEN_NOTIFICATION_ID = 'excerlock.shield.open';

export interface NotificationsPort {
  status(): PermissionStatus;
  request(): Promise<PermissionStatus>;
  scheduleTrialReminder(at: string): Promise<string>;
  scheduleWalkLeaseWarning(at: string): Promise<string>;
  cancel(id: string): Promise<void>;
}
