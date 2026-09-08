import { bindIdentity, teardownIdentity } from '../identity';

test('binding identifies subscription then analytics with the same user id', () => {
  const calls: string[] = [];
  bindIdentity(
    {
      subscription: {
        identify: (userId) => calls.push(`subscription:${userId}`),
        reset: () => {},
      },
      analytics: {
        identify: (userId) => calls.push(`analytics:${userId}`),
        reset: () => {},
      },
    },
    'user-123',
  );
  expect(calls).toEqual(['subscription:user-123', 'analytics:user-123']);
});

test.each(['sign-out', 'deletion'])('%s tears down subscription, analytics, then auth', async () => {
  const calls: string[] = [];
  await teardownIdentity(
    {
      subscription: {
        identify: () => {},
        reset: () => calls.push('subscription'),
      },
      analytics: {
        identify: () => {},
        reset: () => calls.push('analytics'),
      },
    },
    async () => {
      calls.push('auth');
    },
  );
  expect(calls).toEqual(['subscription', 'analytics', 'auth']);
});
