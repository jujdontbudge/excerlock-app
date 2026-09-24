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
  /** The paywall sells what the user said they want, never what the app does. */
  promises: {
    body: {
      lose: 'Lose the body fat and feel light again',
      gain: "Build the muscle you've always wanted",
      maintain: 'Stay fit, strong and healthy for life',
      fallback: 'Feel stronger and healthier every week',
    },
    dream: {
      exercise: 'Become someone who loves to move',
      screenTime: 'Break free from endless scrolling',
      wellness: 'Feel calmer, sharper and full of energy',
      other: 'Become the best version of yourself',
    },
    time: (days: number) => `Win back ${days} days a year for what matters`,
  },
  noPayment: 'No payment due now',
  trialBadge: (offer: string) => `${offer} trial`,
  restoreShort: 'Restore',
  plans: [
    { id: 'annual', title: 'Annual', price: '$–.–– / year · 7-day free trial' },
    { id: 'monthly', title: 'Monthly', price: '$–.–– / month' },
    { id: 'lifetime', title: 'Lifetime', price: '$–.–– once' },
  ],
  start: 'Start for free',
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
 * On Johan's call (September 23, 2026) the paywall carries no billed-price line or legal links under
 * its button: the plan cards compare per month, the billed amount stays in each card's spoken label,
 * the App Store purchase sheet states the price and renewal before any charge, and the Privacy Policy
 * and Terms of Use stay in Settings → Legal.
 */
/** A price per month, as the plan cards show it. */
export const perMonth = (price: string) => `${price}/mo`;

const planNames: Record<string, string> = { year: 'Yearly', month: 'Monthly', week: 'Weekly', day: 'Daily' };
/** A plan card names the plan by how often it bills, falling back to the store's own title. */
export const planName = (product: { title: string; periodUnit: string | null }) =>
  (product.periodUnit && planNames[product.periodUnit]) || product.title;

/** Plan-row title line: the plan name and the billed renewal price, one string. */
export function planRowTitle(product: { title: string; localizedPrice: string; localizedPeriod: string }): string {
  return `${product.title} · ${product.localizedPrice} / ${product.localizedPeriod}`;
}
