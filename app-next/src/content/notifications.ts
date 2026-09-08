import { LeaseWarningVariant } from '../ports/NotificationsPort';

// B14/B30: the two user-facing local notifications. Payoff first, no guilt, no exclamation hype;
// a title is at most 35 characters and a body at most 90 so nothing truncates on the lock screen.
export const notificationCopy = {
  titleMax: 35,
  bodyMax: 90,
  trial: {
    title: (daysBefore: number) =>
      daysBefore === 1 ? 'Your free trial ends tomorrow' : `Your free trial ends in ${daysBefore} days`,
    body: 'Keep your apps behind movement. Review or change your plan in Settings.',
  },
  lease: {
    handheld: {
      title: 'Your walk check is due soon',
      body: 'Keep walking with your phone in hand to keep your walk going.',
    },
    propped: {
      title: 'Scan again to keep counting',
      body: 'Open ExcerLock and scan again to keep your walk going.',
    },
  } satisfies Record<LeaseWarningVariant, { title: string; body: string }>,
} as const;
