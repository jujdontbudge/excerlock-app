jest.mock('../../updates', () => ({ getOtaObservabilityContext: () => ({ update_id: 'update-1', runtime_version: 'runtime-1' }) }));
import { buildSentryOptions, initializeSentryOnce, resetSentryInitializationForTests, scrubSentryBreadcrumb, scrubSentryEvent } from '../sentry';
test('uses exact release/dist and crash-only options', () => { const value = buildSentryOptions('dsn', { version: '1.2.3', build: '42', environment: 'preview' }); expect(value).toEqual(expect.objectContaining({ release: 'com.johansardar.excerlock@1.2.3+42', dist: 'runtime-1-update-1', environment: 'preview', tracesSampleRate: 0, sendDefaultPii: false })); });
test('scrubs PII and arbitrary breadcrumbs', () => { expect(scrubSentryEvent({ user: { id: 'uid' }, request: { url: 'secret' }, extra: { generation: 2, email: 'x' }, tags: { environment: 'preview', secret: 'x' } })).toEqual(expect.objectContaining({ user: undefined, request: undefined, extra: { generation: 2 }, tags: { environment: 'preview', runtime_version: 'runtime-1', update_id: 'update-1' } })); expect(scrubSentryBreadcrumb({ category: 'http', message: 'url' })).toBeNull(); });
test('initializes at most once and stays disabled without a DSN', () => {
  resetSentryInitializationForTests(); const init = jest.fn(); const metadata = { version: '1.2.3', build: '42', environment: 'preview' };
  expect(initializeSentryOnce(init, undefined, metadata)).toBe(false);
  expect(initializeSentryOnce(init, 'dsn', metadata)).toBe(true);
  expect(initializeSentryOnce(init, 'dsn', metadata)).toBe(false);
  expect(init).toHaveBeenCalledTimes(1);
});
