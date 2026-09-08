import { base } from './base';

export const returningSubscriber = base('returning-subscriber', 'Returning subscriber', {
  session: {
    kind: 'signedIn',
    userId: 'fake-returning-subscriber',
    provider: 'email',
    email: 'alex@example.test',
  },
  entitlement: { status: 'active', renewsAt: '2026-10-07T15:00:00.000Z' },
});
