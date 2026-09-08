import type { ErrorEvent } from '@sentry/react-native';
import { buildSentryOptions, scrubSentryEvent } from '../sentry';
import { readClientObservabilityConfig } from '../runtimeConfig';

describe('buildSentryOptions', () => {
  test('returns nothing without a DSN, so a keyless build simply has no Sentry', () => {
    expect(buildSentryOptions(undefined)).toBeNull();
    expect(buildSentryOptions('   ')).toBeNull();
  });

  test('collects crashes and nothing else', () => {
    const options = buildSentryOptions('https://key@sentry.io/1');
    expect(options).toMatchObject({
      dsn: 'https://key@sentry.io/1',
      attachScreenshot: false,
      attachThreads: false,
      attachViewHierarchy: false,
      enableAutoPerformanceTracing: false,
      enableCaptureFailedRequests: false,
      enableNativeCrashHandling: true,
      enableUserInteractionTracing: false,
      replaysOnErrorSampleRate: 0,
      replaysSessionSampleRate: 0,
      sendDefaultPii: false,
      tracesSampleRate: 0,
    });
  });

  test('scrubs every event on its way out', () => {
    expect(buildSentryOptions('https://key@sentry.io/1')?.beforeSend).toBe(scrubSentryEvent);
  });
});

describe('scrubSentryEvent', () => {
  const event = (): ErrorEvent =>
    ({
      user: { id: 'supabase-uid', email: 'alex@example.test' },
      request: { url: 'https://api.excerlock.com/v1/rules' },
      message: 'Failed to reach Anytime Fitness Kensington',
      extra: { gym: 'Anytime Fitness Kensington', latitude: 40.7 },
      tags: { gym: 'Anytime Fitness Kensington' },
      transaction: '/settings/gyms',
      fingerprint: ['gym', 'Anytime Fitness Kensington'],
      contexts: { device: { name: "Alex's iPhone" }, react: { componentStack: '\n at GymsScreen' } },
      breadcrumbs: [{ message: 'Saved gym Anytime Fitness', data: { latitude: 40.7 } }],
      exception: {
        values: [
          {
            type: 'TypeError',
            value: "Cannot read 'id' of undefined at /Users/alex/gyms/Anytime.ts",
            mechanism: { type: 'generic', data: { address: '12 Kensington High Street' } },
            stacktrace: {
              frames: [
                {
                  function: 'saveGym',
                  filename: 'GymsScreen.tsx',
                  context_line: "const name = 'Anytime Fitness Kensington'",
                  pre_context: ['// nearby'],
                  post_context: ['//'],
                  vars: { latitude: 40.7 },
                },
              ],
            },
          },
        ],
      },
    }) as unknown as ErrorEvent;

  test('drops the identity, the request, and every free-text field', () => {
    const scrubbed = scrubSentryEvent(event());
    expect(scrubbed.user).toBeUndefined();
    expect(scrubbed.request).toBeUndefined();
    expect(scrubbed.message).toBeUndefined();
    expect(scrubbed.extra).toBeUndefined();
    expect(scrubbed.tags).toBeUndefined();
    expect(scrubbed.transaction).toBeUndefined();
    expect(scrubbed.fingerprint).toBeUndefined();
  });

  test('drops breadcrumb messages and data', () => {
    const [breadcrumb] = scrubSentryEvent(event()).breadcrumbs ?? [];
    expect(breadcrumb).toEqual({});
  });

  test('keeps the exception shape and drops its content', () => {
    const [exception] = scrubSentryEvent(event()).exception?.values ?? [];
    expect(exception.type).toBe('TypeError');
    expect(exception.value).toBeUndefined();
    expect(exception.mechanism?.data).toBeUndefined();
    const [frame] = exception.stacktrace?.frames ?? [];
    expect(frame.function).toBe('saveGym');
    expect(frame.filename).toBe('GymsScreen.tsx');
    expect(frame.context_line).toBeUndefined();
    expect(frame.pre_context).toBeUndefined();
    expect(frame.post_context).toBeUndefined();
    expect(frame.vars).toBeUndefined();
  });

  test('keeps the component stack and nothing else from contexts', () => {
    expect(scrubSentryEvent(event()).contexts).toEqual({
      react: { componentStack: '\n at GymsScreen' },
    });
  });

  test('a scrubbed payload never mentions a gym, an address or a device name', () => {
    const serialized = JSON.stringify(scrubSentryEvent(event()));
    for (const secret of ['Anytime', 'Kensington', "Alex's iPhone", 'alex@example.test', '40.7']) {
      expect(serialized).not.toContain(secret);
    }
  });
});

describe('readClientObservabilityConfig', () => {
  test('reads the three keys app.config.ts copies into expo.extra', () => {
    expect(
      readClientObservabilityConfig({
        clientObservability: {
          posthogApiKey: ' phc_test ',
          posthogHost: 'https://us.i.posthog.com',
          sentryDsn: 'https://key@sentry.io/1',
        },
      }),
    ).toEqual({
      posthogApiKey: 'phc_test',
      posthogHost: 'https://us.i.posthog.com',
      sentryDsn: 'https://key@sentry.io/1',
    });
  });

  test('a build without the dotfile reports no keys rather than throwing', () => {
    for (const extra of [undefined, null, {}, { clientObservability: null }, 'nonsense']) {
      expect(readClientObservabilityConfig(extra)).toEqual({
        posthogApiKey: undefined,
        posthogHost: undefined,
        sentryDsn: undefined,
      });
    }
  });

  test('an empty key counts as absent, not as a key that fails at runtime', () => {
    expect(readClientObservabilityConfig({ clientObservability: { posthogApiKey: '  ' } })).toEqual({
      posthogApiKey: undefined,
      posthogHost: undefined,
      sentryDsn: undefined,
    });
  });
});
