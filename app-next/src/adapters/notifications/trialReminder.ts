import { addDays, dayKey, localInstant } from '../../domain/calendar';
import { Entitlement } from '../../domain/types';
import { TrialOffer } from '../../ports/SubscriptionPort';

/** The reminder lands at 18:00 local, `daysBefore` days ahead of the trial's end. */
export const TRIAL_REMINDER_MINUTE_OF_DAY = 18 * 60;
/** A trial shorter than this is reminded exactly 24 hours before it ends instead. */
export const SHORT_TRIAL_DAYS = 3;
const DAY_MS = 86_400_000;

/** How many days ahead the reminder lands, clamped the way the trial screens' copy is. */
export function trialReminderDays(offer: TrialOffer): number {
  return Math.min(offer.reminderDaysBefore, Math.max(1, offer.trialDays - 1));
}

export type TrialReminderInput = {
  entitlement: Entitlement;
  offer: TrialOffer;
  now: string;
  timezone: string;
};

/**
 * When the trial reminder fires, or null when there is nothing to remind: no trial, no known end,
 * or a fire time that has already passed (a late reminder is noise, not a reminder).
 */
export function trialReminderAt({ entitlement, offer, now, timezone }: TrialReminderInput): string | null {
  if (entitlement.status !== 'trial' || !entitlement.renewsAt) return null;
  const end = Date.parse(entitlement.renewsAt);
  if (!Number.isFinite(end)) return null;
  const at =
    offer.trialDays < SHORT_TRIAL_DAYS
      ? new Date(end - DAY_MS).toISOString()
      : localInstant(
          addDays(dayKey(entitlement.renewsAt, timezone), -trialReminderDays(offer)),
          TRIAL_REMINDER_MINUTE_OF_DAY,
          timezone,
        );
  return Date.parse(at) > Date.parse(now) ? at : null;
}
