import { describeAnalyticsPort } from '../../../ports/__tests__/analyticsContract';
import { AnalyticsPort } from '../../../ports/AnalyticsPort';
import { createPostHogAnalytics } from '../postHogAnalytics';
import { recordingClient, RecordingClient } from './recordingClient';

describeAnalyticsPort(() =>
  createPostHogAnalytics(recordingClient(), { isEnabled: () => true, isAnonymous: () => false }),
);

describe('what the adapter sends', () => {
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
    expect(client.signals.filter((signal) => signal.kind === 'reset')).toHaveLength(1);
  });
});
