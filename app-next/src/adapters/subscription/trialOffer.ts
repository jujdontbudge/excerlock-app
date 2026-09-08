import type { AdaptyPaywallProduct, AdaptySubscriptionPeriod } from 'react-native-adapty';
import { TrialOffer } from '../../ports/SubscriptionPort';

/** Used until Adapty answers, and kept whenever the catalog cannot be read. */
export const DEFAULT_TRIAL_OFFER: TrialOffer = { trialDays: 7, reminderDaysBefore: 2, label: '7-day free trial' };

/** How early the trial reminder fires. Ours to choose; Adapty carries no reminder concept. */
const REMINDER_DAYS_BEFORE = 2;
const DAYS_PER_UNIT: Record<string, number> = { day: 1, week: 7, month: 30, year: 365 };

/**
 * The trial the T1–T4 screens describe, read from the catalog rather than assumed. Returns null when no
 * product carries a free trial, so the caller keeps the offer it already had instead of promising zero days.
 */
export function trialOfferFromProducts(products: readonly AdaptyPaywallProduct[]): TrialOffer | null {
  const trialDays = Math.max(0, ...products.map(freeTrialDays));
  if (trialDays <= 0) return null;
  return {
    trialDays,
    reminderDaysBefore: Math.min(REMINDER_DAYS_BEFORE, Math.max(1, trialDays - 1)),
    label: `${trialDays}-day free trial`,
  };
}

function freeTrialDays(product: AdaptyPaywallProduct): number {
  const phase = product.subscription?.offer?.phases.find((candidate) => candidate.paymentMode === 'free_trial');
  return phase ? phase.numberOfPeriods * periodDays(phase.subscriptionPeriod) : 0;
}

function periodDays(period: AdaptySubscriptionPeriod): number {
  return period.numberOfUnits * (DAYS_PER_UNIT[period.unit] ?? 0);
}
