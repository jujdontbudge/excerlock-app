import { AnalyticsPort } from '../../../ports/AnalyticsPort';
import { AnalyticsFake } from '../../../demo/fakes/AnalyticsFake';
import { FakeContext } from '../../../demo/FakeContext';
import { scenarios } from '../../../demo/scenarios';
import { createPostHogAnalytics } from '../postHogAnalytics';
import { recordingClient, RecordingClient } from './recordingClient';

/**
 * One suite, both implementations. Everything asserted here is behaviour a caller may rely on
 * without knowing whether it holds the fake or the real adapter.
 */
const implementations: [name: string, build: () => AnalyticsPort][] = [
  ['the recording fake', () => AnalyticsFake(new FakeContext(scenarios[0]))],
  [
    'the PostHog adapter',
    () =>
      createPostHogAnalytics(recordingClient(), {
        isEnabled: () => true,
        isAnonymous: () => false,
      }),
  ],
];

describe.each(implementations)('AnalyticsPort — %s', (_name, build) => {
  let analytics: AnalyticsPort;
  beforeEach(() => {
    analytics = build();
  });

  test('accepts an event with and without properties', () => {
    expect(() => analytics.track('shields_applied')).not.toThrow();
    expect(() => analytics.track('condition_created', { activity: 'walking' })).not.toThrow();
  });

  test('accepts a screen, an identity, person properties and a reset', () => {
    expect(() => analytics.screen('O01')).not.toThrow();
    expect(() => analytics.identify('user-1')).not.toThrow();
    expect(() => analytics.setPersonProperties({ ageBand: '25–34' })).not.toThrow();
    expect(() => analytics.reset()).not.toThrow();
  });

  test('an unknown event never throws at the call site', () => {
    expect(() => analytics.track('not_a_registered_event', { anything: 1 })).not.toThrow();
  });

  test('every method returns void, so no call site can await analytics', () => {
    expect(analytics.track('shields_applied')).toBeUndefined();
    expect(analytics.screen('O01')).toBeUndefined();
    expect(analytics.identify('user-1')).toBeUndefined();
    expect(analytics.setPersonProperties({ ageBand: '25–34' })).toBeUndefined();
    expect(analytics.reset()).toBeUndefined();
  });
});

describe('the PostHog adapter, specifically', () => {
  let client: RecordingClient;
  let analytics: AnalyticsPort;
  beforeEach(() => {
    client = recordingClient();
    analytics = createPostHogAnalytics(client, { isEnabled: () => true, isAnonymous: () => false });
  });

  test('stamps the app super property once, before the first event', () => {
    analytics.track('shields_applied');
    analytics.track('shields_lifted');
    expect(client.registered).toEqual([{ app: 'excerlock' }]);
    // Registered before the first capture, so no event is ever missing the super property.
    const register = client.signals.findIndex((signal) => signal.kind === 'register');
    const capture = client.signals.findIndex((signal) => signal.kind === 'capture');
    expect(register).toBeGreaterThanOrEqual(0);
    expect(register).toBeLessThan(capture);
  });

  test('captures a registered client event under its registry name', () => {
    analytics.track('rule_met', {
      activity: 'gym',
      mode: 'event',
      day: 3,
      window_bucket: 'first_hour',
    });
    expect(client.captured).toEqual([
      {
        event: 'rule_met',
        props: { activity: 'gym', mode: 'event', day: 3, window_bucket: 'first_hour' },
      },
    ]);
  });

  test('drops an event the registry does not give the client', () => {
    analytics.track('subscription_renewed');
    analytics.track('support_request_submitted', { category: 'bug' });
    analytics.track('earn_claimed');
    expect(client.captured).toEqual([]);
  });

  test('reports a screen as a bare $screen, with no properties', () => {
    analytics.screen('X3a');
    expect(client.signals).toContainEqual({ kind: 'screen', name: 'X3a', props: {} });
  });

  test('reset clears the identity and re-registers on the next event', () => {
    analytics.track('shields_applied');
    analytics.reset();
    analytics.track('shields_lifted');
    expect(client.registered).toHaveLength(2);
    expect(client.signals.filter((s) => s.kind === 'reset')).toHaveLength(1);
  });
});
