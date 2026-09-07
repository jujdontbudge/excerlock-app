export const impactCopy = {
  percentageLabel: 'of your free time spent on your phone',
  spent: '…spent scrolling',
  conclusion: 'That’s time you could put toward what matters to you.',
  assumption: 'Illustration assumes 8 free hours a day after sleep, work, and life admin.',
  overflow: 'Your scrolling estimate exceeds the illustrated free-time allowance.',
  year: '365 days, one dot per day',
  free: (count: number) => `${count} days of free-time equivalent remain`,
  scrolling: (days: number, free: number) => `${days} of ${free} free-time equivalent days spent scrolling`,
};
