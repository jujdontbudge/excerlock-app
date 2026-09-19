// Phase 1 offer fixture only. Phase 2 must read Adapty's real offer and prices.
export const fakeOffer = { trialDays: 7, reminderDaysBefore: 2, label: '7-day free trial' };
export const subscriptionCopy = {
  T1: 'Try ExcerLock free',
  offerBody: 'Make space for movement and the things that matter.',
  benefits: [
    { icon: 'lock-open', text: 'Exercise to unlock your apps' },
    { icon: 'clock', text: 'Blocking that fits your schedule' },
    { icon: 'chart', text: 'See your progress build' },
  ],
  T2: "We'll remind you before it ends",
  reminder: '2 days before your trial ends',
  reminderBody: 'A heads-up, so you can decide what comes next.',
  T3: 'Want a trial reminder?',
  notificationBody: 'Get a reminder before your free trial ends.',
  enable: 'Enable reminders',
  later: 'Maybe later',
  T4: 'How your free trial works',
  timeline: [
    { title: 'Today', body: 'Start your free trial and make your plan.' },
    { title: 'Day 5 · Reminder', body: "We'll remind you if you've enabled notifications." },
    { title: 'Day 7 · Billing begins', body: 'Your subscription starts unless you cancel before the trial ends.' },
  ],
  title: 'Choose your plan',
  body: 'Build a healthier relationship with your phone.',
  plans: [
    { id: 'annual', title: 'Annual', price: '$–.–– / year · 7-day free trial' },
    { id: 'monthly', title: 'Monthly', price: '$–.–– / month' },
    { id: 'lifetime', title: 'Lifetime', price: '$–.–– once' },
  ],
  start: 'Start free trial',
  continue: 'Continue',
  decline: 'Not now',
  restore: 'Restore purchases',
  terms:
    'Subscriptions renew automatically unless canceled. Manage or cancel your subscription in your App Store account.',
  expired: 'Your trial has ended. Choose a plan to keep going.',
  billingIssue: 'There is a billing issue with your subscription. Restore access or choose a plan.',
  error: 'Something went wrong. Please try again.',
  notFound: 'No active purchase was found.',
  restored: 'Your purchase has been restored.',
  cancelled: 'Choose a plan to continue.',
  purchasing: 'Starting your plan…',
  restoring: 'Restoring purchases…',
  devNote: 'Paywall stand-in. Prices and the 7-day trial are placeholders. No purchase occurs.',
  restoreOutcome: 'Restore result',
  restoreOutcomes: ['restored', 'notFound'],
  manage: 'Manage in App Store',
  manageFallback:
    "Change or cancel in Settings → Apple Account → Subscriptions. TestFlight sandbox subscriptions aren't listed there and end on their own.",
  billingSupport: 'Billing is handled by the App Store.',
} as const;

export const appStoreSubscriptionsUrl = 'https://apps.apple.com/account/subscriptions';

/**
 * Guideline 3.1.2(c): the billed renewal price is the most prominent pricing
 * element. The footer and the plan-row title lead with it; the trial offer
 * follows in smaller support text. `offerLabel` is the adapter's
 * "<numberOfPeriods> <unit> free" label, so "after your 7 day free trial"
 * reads as one sentence.
 */
export function priceFirstFooterLabel(product: {
  localizedPrice: string;
  localizedPeriod: string;
  offerLabel: string | null;
}): string {
  return product.offerLabel
    ? `${product.localizedPrice} / ${product.localizedPeriod} after your ${product.offerLabel} trial. Cancel anytime.`
    : `${product.localizedPrice} / ${product.localizedPeriod}. Cancel anytime.`;
}

/** Plan-row title line: the plan name and the billed renewal price, one string. */
export function planRowTitle(product: { title: string; localizedPrice: string; localizedPeriod: string }): string {
  return `${product.title} · ${product.localizedPrice} / ${product.localizedPeriod}`;
}
