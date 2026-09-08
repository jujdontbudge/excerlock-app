import { createPostHogAnalytics } from '../postHogAnalytics';
import { recordingClient } from './recordingClient';

function withConsent(initial: boolean) {
  let enabled = initial;
  const client = recordingClient();
  const analytics = createPostHogAnalytics(client, {
    isEnabled: () => enabled,
    isAnonymous: () => false,
  });
  return { client, analytics, set: (next: boolean) => void (enabled = next) };
}

/** Everything a person can do that would otherwise reach PostHog. */
function emitEverything(analytics: ReturnType<typeof withConsent>['analytics']) {
  analytics.track('shields_applied');
  analytics.track('condition_created', { activity: 'walking', mode: 'state' });
  analytics.track('paywall_viewed', { placement: 'onboarding', has_trial: true });
  analytics.screen('O01');
  analytics.identify('supabase-user-1');
  analytics.setPersonProperties({ ageBand: '25–34' });
}

test('opting out suppresses every capture, screen, identify and person property', () => {
  const { client, analytics } = withConsent(false);
  emitEverything(analytics);
  expect(client.signals.filter((signal) => signal.kind !== 'optOut')).toEqual([]);
});

test('opting out reaches the SDK, so nothing already queued is flushed later', () => {
  const { client, analytics } = withConsent(false);
  analytics.track('shields_applied');
  expect(client.signals).toEqual([{ kind: 'optOut' }]);
});

test('the super property is not registered while analytics is off', () => {
  const { client, analytics } = withConsent(false);
  analytics.track('shields_applied');
  expect(client.registered).toEqual([]);
});

test('the answer is re-read on every emit, so turning it off stops the very next event', () => {
  const { client, analytics, set } = withConsent(true);
  analytics.track('shields_applied');
  set(false);
  analytics.track('shields_lifted');
  analytics.screen('O01');
  expect(client.captured).toEqual([{ event: 'shields_applied', props: {} }]);
});

test('turning it back on opts the SDK in and re-registers before the next event', () => {
  const { client, analytics, set } = withConsent(false);
  analytics.track('shields_applied');
  set(true);
  analytics.track('shields_lifted');
  expect(client.signals).toEqual([
    { kind: 'optOut' },
    { kind: 'optIn' },
    { kind: 'register', props: { app: 'excerlock' } },
    { kind: 'capture', event: 'shields_lifted', props: {} },
  ]);
});

test('an unchanged answer is not pushed to the SDK again', () => {
  const { client, analytics } = withConsent(true);
  analytics.track('shields_applied');
  analytics.track('shields_lifted');
  analytics.screen('O01');
  expect(client.signals.filter((signal) => signal.kind === 'optIn')).toHaveLength(1);
});

test('syncConsent pushes the answer even when nothing is emitted afterwards', () => {
  const { client, analytics, set } = withConsent(true);
  analytics.syncConsent();
  set(false);
  analytics.syncConsent();
  expect(client.signals.filter((signal) => signal.kind === 'optOut')).toHaveLength(1);
});
