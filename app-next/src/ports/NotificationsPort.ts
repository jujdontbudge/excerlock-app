import { PermissionStatus, WalkingPlacement } from '../domain/types';

// B14 (amended by B30): two user-facing local notifications, both scheduled through this port,
// plus the shield tap-through id. ShieldAction is the only writer of the third id — nothing on
// this port schedules it, and the app only ever reads or cancels it.
export const SHIELD_OPEN_NOTIFICATION_ID = 'excerlock.shield.open';

/**
 * What renews the walking lease: keep walking with the phone in hand, or scan again when propped.
 * It is the session's own placement, not a second vocabulary, so the warning can never name a
 * renewal the session does not have.
 */
export type LeaseWarningVariant = WalkingPlacement;

/** One request iOS still holds. `at` is null for a trigger that is not a fixed instant. */
export type PendingNotification = { id: string; at: string | null };

export interface NotificationsPort {
  status(): PermissionStatus;
  request(): Promise<PermissionStatus>;
  /** `daysBefore` is how far ahead of the trial end `at` lands; the adapter says so in the copy. */
  scheduleTrialReminder(at: string, daysBefore?: number): Promise<string>;
  scheduleWalkLeaseWarning(at: string, variant?: LeaseWarningVariant): Promise<string>;
  cancel(id: string): Promise<void>;
  /**
   * What is still scheduled. Read by the developer menu only: a lease warning that never arrives is
   * either never scheduled or scheduled for the wrong instant, and on a device with no debugger
   * attached those two look identical.
   */
  pending(): Promise<PendingNotification[]>;
}
