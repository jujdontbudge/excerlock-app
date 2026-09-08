import { SHIELD_OPEN_NOTIFICATION_ID } from '../../ports/NotificationsPort';

/**
 * The closed catalog (B14 amended by B30): two ids the app schedules and one the ShieldAction
 * extension enqueues. Identifiers are fixed, so scheduling a kind again replaces the pending one
 * instead of stacking a duplicate, and a cancel after a restart still finds it.
 */
export const TRIAL_REMINDER_ID = 'excerlock.trial-reminder';
export const WALK_LEASE_WARNING_ID = 'excerlock.walk-lease-warning';

export type NotificationKind = 'trialReminder' | 'walkLeaseWarning' | 'shieldOpen';

export const NOTIFICATION_IDS: Readonly<Record<NotificationKind, string>> = {
  trialReminder: TRIAL_REMINDER_ID,
  walkLeaseWarning: WALK_LEASE_WARNING_ID,
  shieldOpen: SHIELD_OPEN_NOTIFICATION_ID,
};

/**
 * Which catalog entry a delivered identifier belongs to. The shield id may carry a dotted cause
 * suffix (the extension enqueues one request per shield cause); anything else is not ours.
 */
export function notificationKind(identifier: string): NotificationKind | null {
  if (identifier === TRIAL_REMINDER_ID) return 'trialReminder';
  if (identifier === WALK_LEASE_WARNING_ID) return 'walkLeaseWarning';
  if (identifier === SHIELD_OPEN_NOTIFICATION_ID || identifier.startsWith(`${SHIELD_OPEN_NOTIFICATION_ID}.`))
    return 'shieldOpen';
  return null;
}
