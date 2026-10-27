import type { TrialOffer } from '../ports/SubscriptionPort';
import { fallbackTrialOffer } from './trialOffer';

export const fakeOffer = fallbackTrialOffer;
export const subscriptionCopy = {
  T1: 'Try ExcerLock free',
  offerBody: 'Make space for movement and the things that matter.',
  benefits: [
    { icon: 'lock-open', text: 'Exercise to unlock your apps' },
    { icon: 'clock', text: 'Blocking that fits your schedule' },
    { icon: 'chart', text: 'See your progress build' },
  ],
  T2: "We'll remind you before it ends",
  reminder: (offer: TrialOffer = fallbackTrialOffer) => `${offer.reminderDaysBefore} day before your trial ends`,
  reminderBody: 'A heads-up, so you can decide what comes next.',
  T3: 'Want a trial reminder?',
  notificationBody: 'Get a reminder before your free trial ends.',
  enable: 'Enable reminders',
  later: 'Maybe later',
  T4: 'How your free trial works',
  timeline: (offer: TrialOffer = fallbackTrialOffer) => [
    { title: 'Today', body: 'Start your free trial and make your plan.' },
    { title: `Day ${offer.trialDays - offer.reminderDaysBefore} · Reminder`, body: "We'll remind you if you've enabled notifications." },
    { title: `Day ${offer.trialDays} · Billing begins`, body: 'Your subscription starts unless you cancel before the trial ends.' },
  ],
  title: 'Choose your plan',
  body: 'Build a healthier relationship with your phone.',
  promises: {
    body: {
      lose: (pounds: number) => `Lose ${pounds.toFixed(1)} pounds of fat`,
      gain: (pounds: number) => `Gain ${pounds.toFixed(1)} pounds of muscle`,
      maintain: 'Stay fit, strong and healthy for life',
      fallback: 'Feel stronger and healthier every week',
    },
    dream: {
      exercise: 'Make movement part of your day',
      screenTime: 'Spend less time scrolling',
      wellness: 'Make room for your wellbeing',
      other: 'Make time for what matters',
    },
    condition: {
      target: (name: string) => `${name} to unlock apps`,
      walking: 'Unlock apps while you walk',
      gym: "Unlock apps while you're at the gym",
    },
    time: (hours: number) => `${hours} ${hours === 1 ? 'hour' : 'hours'} less screen time a day`,
  },
  benefitsTitle: 'Benefits',
  bestOffer: 'Best offer',
  free: 'FREE',
  perWeekShort: '/wk',
  trialThen: (length: string) => `${length} trial then `,
  noPayment: 'No payment due now',
  trialBadge: (offer: string) => `${offer} trial`,
  plans: [
    { id: 'annual', title: 'Annual', price: `$–.–– / year · ${fallbackTrialOffer.label}` },
    { id: 'monthly', title: 'Monthly', price: '$–.–– / month' },
    { id: 'lifetime', title: 'Lifetime', price: '$–.–– once' },
  ],
  start: 'Start for free',
  continue: 'Continue',
  decline: 'Not now',
  restore: 'Restore purchases',
  terms:
    'Subscriptions renew automatically unless canceled. Manage or cancel your subscription in your App Store account.',
  termsOfUse: { title: 'Terms of Use', url: 'https://excerlock.com/terms' },
  privacyPolicy: { title: 'Privacy Policy', url: 'https://excerlock.com/privacy' },
  linkError: "That didn't open. Please try again.",
  error: "That didn't go through. Please try again.",
  notFound: 'No purchase found',
  awaitingApproval: 'Waiting for approval',
  restored: 'Your purchase has been restored.',
  devNote: 'Paywall stand-in. Prices and offers are placeholders. No purchase occurs.',
  restoreOutcome: 'Restore result',
  restoreOutcomes: ['restored', 'notFound'],
  manage: 'Manage in App Store',
  manageFallback: 'Open Settings, tap your name, then Subscriptions.',
  billingSupport: 'Billing is handled by the App Store.',
} as const;

export const appStoreSubscriptionsUrl = 'https://apps.apple.com/account/subscriptions';

export const perMonth = (price: string) => `${price}/mo`;

export const perPeriod = (product: { localizedPrice: string; localizedPeriod: string; periodUnit: string | null }) =>
  product.periodUnit ? `${product.localizedPrice}/${product.periodUnit}` : `${product.localizedPrice} / ${product.localizedPeriod}`;

const planNames: Record<string, string> = { year: 'Yearly', month: 'Monthly', week: 'Weekly', day: 'Daily' };
export const planName = (product: { title: string; periodUnit: string | null }) =>
  (product.periodUnit && planNames[product.periodUnit]) || product.title;

export function planRowTitle(product: { title: string; localizedPrice: string; localizedPeriod: string }): string {
  return `${product.title} · ${product.localizedPrice} / ${product.localizedPeriod}`;
}
