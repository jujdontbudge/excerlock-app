import { PermissionStatus } from '../model/types';
export interface NotificationsPort {
  status(): PermissionStatus;
  request(): Promise<PermissionStatus>;
  scheduleTrialReminder(at: string): Promise<string>;
  scheduleProppedWarning(at: string): Promise<string>;
  scheduleOpenToUnlock(): Promise<string>;
  cancel(id: string): Promise<void>;
}
