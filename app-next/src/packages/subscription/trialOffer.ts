import type { PaywallProduct, TrialOffer } from '../ports/SubscriptionPort';

export const TRIAL_REMINDER_DAYS_BEFORE = 1;
export const fallbackTrialOffer: TrialOffer = { trialDays: 3, reminderDaysBefore: TRIAL_REMINDER_DAYS_BEFORE, label: '3-day free trial' };

export function trialOffer(period: { unit: string; numberOfUnits: number }, periods = 1): TrialOffer {
  const count = period.numberOfUnits * periods;
  if (!Number.isInteger(count) || count <= 0) return fallbackTrialOffer;
  const start = new Date();
  const end = new Date(start);
  if (period.unit === 'day') end.setUTCDate(end.getUTCDate() + count);
  else if (period.unit === 'week') end.setUTCDate(end.getUTCDate() + count * 7);
  else if (period.unit === 'month' || period.unit === 'year') {
    const day = end.getUTCDate();
    end.setUTCDate(1);
    if (period.unit === 'month') end.setUTCMonth(end.getUTCMonth() + count);
    else end.setUTCFullYear(end.getUTCFullYear() + count);
    const lastDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
    end.setUTCDate(Math.min(day, lastDay));
  }
  else return fallbackTrialOffer;
  const trialDays = Math.round((end.getTime() - start.getTime()) / 86400000);
  if (!Number.isFinite(trialDays) || trialDays <= 0) return fallbackTrialOffer;
  const length = period.unit === 'day' || period.unit === 'week' ? `${trialDays}-day` : `${count}-${period.unit}`;
  return { trialDays, reminderDaysBefore: TRIAL_REMINDER_DAYS_BEFORE, label: `${length} free trial` };
}

export function paywallTrialOffer(products: readonly PaywallProduct[]): TrialOffer {
  return products.find((product) => product.recommended && product.trialOffer)?.trialOffer
    ?? products.find((product) => product.trialOffer)?.trialOffer
    ?? fallbackTrialOffer;
}
