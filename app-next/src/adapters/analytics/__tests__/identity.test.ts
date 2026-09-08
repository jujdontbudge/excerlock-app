import { bindIdentity, teardownIdentity } from '../../../domain/identity';
import { ANONYMOUS_USER_ID } from '../../../state/sessionStore';
import { createPostHogAnalytics } from '../postHogAnalytics';
import { recordingClient } from './recordingClient';

function adapter(anonymous: (userId: string) => boolean) {
  const client = recordingClient();
  return {
    client,
    analytics: createPostHogAnalytics(client, { isEnabled: () => true, isAnonymous: anonymous }),
  };
}

const isAnonymous = (userId: string) => userId === ANONYMOUS_USER_ID;

test('an anonymous session leaves the SDK on its own distinct id', () => {
  // Identifying every install as one shared id would merge every anonymous person into one, and
  // would stop PostHog merging that history into the real id at sign-in.
  const { client, analytics } = adapter(isAnonymous);
  analytics.identify(ANONYMOUS_USER_ID);
  expect(client.signals.filter((signal) => signal.kind === 'identify')).toEqual([]);
});

test('signing in identifies the Supabase user id, which merges the anonymous history', () => {
  const { client, analytics } = adapter(isAnonymous);
  analytics.identify(ANONYMOUS_USER_ID);
  analytics.track('paywall_viewed', { placement: 'onboarding', has_trial: true });
  analytics.identify('8f1c-supabase-uid');
  expect(client.signals.filter((signal) => signal.kind === 'identify')).toEqual([
    { kind: 'identify', distinctId: '8f1c-supabase-uid' },
  ]);
});

test('the session-change law identifies the subscription port before analytics', () => {
  const order: string[] = [];
  const ports = {
    subscription: { identify: (id: string) => void order.push(`subscription:${id}`), reset: () => {} },
    analytics: { identify: (id: string) => void order.push(`analytics:${id}`), reset: () => {} },
  };
  bindIdentity(ports, 'supabase-uid');
  expect(order).toEqual(['subscription:supabase-uid', 'analytics:supabase-uid']);
});

test('signing out resets analytics before the auth provider tears the session down', async () => {
  const order: string[] = [];
  const { client, analytics } = adapter(isAnonymous);
  analytics.identify('supabase-uid');
  await teardownIdentity(
    {
      subscription: { identify: () => {}, reset: () => void order.push('subscription') },
      analytics: {
        identify: () => {},
        reset: () => {
          order.push('analytics');
          analytics.reset();
        },
      },
    },
    async () => void order.push('auth'),
  );
  expect(order).toEqual(['subscription', 'analytics', 'auth']);
  expect(client.signals.at(-1)).toEqual({ kind: 'reset' });
});

test('reset drops the identity, so the next session starts anonymous again', () => {
  const { client, analytics } = adapter(isAnonymous);
  analytics.identify('supabase-uid');
  analytics.reset();
  analytics.identify(ANONYMOUS_USER_ID);
  expect(client.signals.filter((signal) => signal.kind === 'identify')).toEqual([
    { kind: 'identify', distinctId: 'supabase-uid' },
  ]);
});

test('an identity is never sent while analytics is off', () => {
  const client = recordingClient();
  createPostHogAnalytics(client, { isEnabled: () => false, isAnonymous }).identify('supabase-uid');
  expect(client.signals.filter((signal) => signal.kind === 'identify')).toEqual([]);
});
