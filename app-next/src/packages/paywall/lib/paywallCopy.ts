export const paywallCopy = {
  title: 'Get your DREAM BODY with ExcerLock',
  lead: 'Get your',
  hot: 'DREAM BODY',
  tail: 'with ExcerLock',
  tagline: {
    text: 'HACK your brain and become ADDICTED to exercise.',
    lines: ['HACK your brain and become', 'ADDICTED to exercise.'],
    hot: ['HACK', 'ADDICTED'],
  },
  review: {
    title: 'Life changing',
    byline: 'by Alexandra R.',
    stars: '5 stars',
    quote: '“This finally got me to lose 15 lbs after months of no progress.”',
  },
  perWeek: ' / week',
  billedAs: (price: string) => `Billed as ${price}`,
  trialThenBilled: (length: string, price: string) => `${length} free trial, then ${price}`,
  retry: 'Try again',
  confirming: 'Payment received. Confirming your purchase…',
  stillConfirming: 'Still confirming with the App Store. Try Restore purchases again in a moment.',
  account: 'Account and help',
} as const;
