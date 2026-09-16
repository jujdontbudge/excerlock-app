/* eslint-disable @typescript-eslint/no-require-imports -- each test re-requires mocked modules to prove install order */
/**
 * A5: the entry installs Sentry before the runtime boot gate, and a throw on
 * the way to that gate reaches the SDK capture hook through the scrubber.
 *
 * The SDK is a miniature of the real pipeline: `init` stores the options the
 * production code passes (including `beforeSend`), and `captureException`
 * builds an Error-derived event, applies `beforeSend`, then hands the result
 * to the recorded mock transport.
 */
import * as fs from 'fs';
import * as path from 'path';

jest.mock('../../updates', () => ({ getOtaObservabilityContext: () => ({ update_id: 'update-1', runtime_version: 'runtime-1' }) }));

const mockExpoConfig: { value: unknown } = { value: null };
jest.mock('expo-constants', () => ({
  __esModule: true,
  get default() {
    return {
      get expoConfig() {
        return mockExpoConfig.value;
      },
    };
  },
}));

type SentryEvent = Record<string, unknown>;
const mockSentry = {
  initializations: [] as Record<string, unknown>[],
  captures: [] as SentryEvent[],
  transport: [] as SentryEvent[],
};
jest.mock('@sentry/react-native', () => ({
  init: (options: Record<string, unknown>) => {
    mockSentry.initializations.push(options);
  },
  captureException: (error: unknown) => {
    const options = mockSentry.initializations[mockSentry.initializations.length - 1];
    const thrown = error instanceof Error;
    const event: SentryEvent = {
      exception: {
        values: [
          {
            type: thrown ? (error as Error).name : 'Error',
            value: thrown ? (error as Error).message : String(error),
            ...(thrown ? {} : { mechanism: { type: 'generic', handled: true, synthetic: true } }),
            stacktrace: { frames: [{ filename: 'index.js', lineno: 1 }] },
          },
        ],
      },
      message: 'raw message with x@example.com',
      user: { id: 'uid-1' },
      request: { url: 'https://api.excerlock.com/private' },
      contexts: { device: { name: 'private-device' } },
      breadcrumbs: [{ category: 'lock', message: 'private-breadcrumb' }],
      attachments: [{ filename: 'private.txt' }],
      tags: { environment: 'prod', secret: 'private-tag' },
    };
    mockSentry.captures.push(event);
    const scrubbed = typeof options?.beforeSend === 'function' ? (options.beforeSend as (event: SentryEvent) => SentryEvent)(event) : event;
    mockSentry.transport.push(scrubbed);
  },
}));

const clientExtra = () => ({
  environment: 'prod',
  clientAuth: {
    supabaseUrl: 'https://project.supabase.co',
    supabaseAnonKey: 'public-anon-key',
    googleIosClientId: '123456-example.apps.googleusercontent.com',
    googleRedirectUri: 'com.googleusercontent.apps.123456-example:/oauthredirect',
  },
  clientApi: { url: 'https://api.excerlock.com' },
  clientSubscription: { adaptyKey: 'public-adapty-key' },
  clientObservability: {
    posthogApiKey: 'phc_public',
    posthogHost: 'https://us.i.posthog.com',
    sentryDsn: 'https://public@o1.ingest.sentry.io/42',
  },
});

beforeEach(() => {
  jest.resetModules();
  mockSentry.initializations.length = 0;
  mockSentry.captures.length = 0;
  mockSentry.transport.length = 0;
  mockExpoConfig.value = { version: '1.4.2', ios: { buildNumber: '77' }, extra: clientExtra() };
});

test('installs Sentry from the embedded client configuration as soon as the entry imports it', () => {
  require('../SentryStartup');
  expect(mockSentry.initializations).toHaveLength(1);
  expect(mockSentry.initializations[0]).toMatchObject({
    dsn: 'https://public@o1.ingest.sentry.io/42',
    environment: 'prod',
    release: 'com.johansardar.excerlock@1.4.2+77',
    dist: 'runtime-1-update-1',
    sendDefaultPii: false,
    enableNativeCrashHandling: true,
  });
});

test('never installs twice when the boot gate reaches client services later', () => {
  const { initializeSentryAtStartup } = require('../SentryStartup') as typeof import('../SentryStartup');
  expect(mockSentry.initializations).toHaveLength(1);
  expect(initializeSentryAtStartup()).toBe(false);
  expect(mockSentry.initializations).toHaveLength(1);
});

test('a throw before the runtime boot gate reaches the capture hook and the mock transport', () => {
  require('../SentryStartup');
  expect(mockSentry.initializations).toHaveLength(1);
  const { reportRuntimeError } = require('../../productionRuntime') as typeof import('../../productionRuntime');
  reportRuntimeError(new Error('ExcerLock could not start: pre-boot failure'));

  expect(mockSentry.captures).toHaveLength(1);
  expect(mockSentry.transport).toHaveLength(1);
  const delivered = mockSentry.transport[0];
  expect(delivered).toMatchObject({
    exception: {
      values: [
        {
          type: 'Error',
          value: 'ExcerLock could not start: pre-boot failure',
          stacktrace: { frames: [{ filename: 'index.js', lineno: 1 }] },
        },
      ],
    },
    tags: { environment: 'prod', runtime_version: 'runtime-1', update_id: 'update-1' },
  });
  for (const dropped of ['message', 'user', 'request', 'contexts', 'breadcrumbs', 'attachments']) {
    expect(delivered[dropped]).toBeUndefined();
  }
  expect((delivered.tags as Record<string, unknown>).secret).toBeUndefined();
});

test('a missing or foreign client configuration skips the install without throwing from the entry', () => {
  mockExpoConfig.value = null;
  const { initializeSentryAtStartup } = require('../SentryStartup') as typeof import('../SentryStartup');
  expect(mockSentry.initializations).toHaveLength(0);

  // The lab environment is refused by the production parser and installs no SDK.
  mockExpoConfig.value = { version: '1.4.2', ios: { buildNumber: '77' }, extra: { environment: 'lab' } };
  expect(initializeSentryAtStartup()).toBe(false);
  expect(mockSentry.initializations).toHaveLength(0);

  // The lazy client-services call can still install once a valid configuration reads.
  mockExpoConfig.value = { version: '1.4.2', ios: { buildNumber: '77' }, extra: clientExtra() };
  expect(initializeSentryAtStartup()).toBe(true);
  expect(mockSentry.initializations).toHaveLength(1);
});

test('index.js imports the Sentry startup module before the runtime boot entry', () => {
  const entry = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'index.js'), 'utf8');
  const startup = entry.indexOf("import './src/runtime/observability/SentryStartup';");
  const runtime = entry.indexOf("import './src/runtime/productionRuntime';");
  const tasks = entry.indexOf("import './src/engine/signals/location/registerLocationTasks';");
  const router = entry.indexOf("import 'expo-router/entry';");
  expect(startup).toBeGreaterThanOrEqual(0);
  expect(entry.slice(0, startup)).not.toMatch(/^import /m);
  expect(runtime).toBeGreaterThan(startup);
  expect(tasks).toBeGreaterThan(runtime);
  expect(router).toBeGreaterThan(tasks);
});
