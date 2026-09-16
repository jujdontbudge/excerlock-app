jest.mock('../../updates', () => ({ getOtaObservabilityContext: () => ({ update_id: 'update-1', runtime_version: 'runtime-1' }) }));
import { buildSentryOptions, initializeSentryOnce, resetSentryInitializationForTests, scrubSentryBreadcrumb, scrubSentryEvent } from '../sentry';
test('uses exact release/dist and crash-only options', () => { const value = buildSentryOptions('dsn', { version: '1.2.3', build: '42', environment: 'preview' }); expect(value).toEqual(expect.objectContaining({ release: 'com.johansardar.excerlock@1.2.3+42', dist: 'runtime-1-update-1', environment: 'preview', sendDefaultPii: false })); expect(value).not.toHaveProperty('tracesSampleRate'); expect(value).not.toHaveProperty('tracesSampler'); });
test('scrubs PII property classes while preserving a thrown Error message and stacktrace', () => {
  const stacktrace = { frames: [{ filename: 'app.js', lineno: 4 }] };
  expect(scrubSentryEvent({ message: 'email x@example.com', logentry: { message: 'secret' }, user: { id: 'uid' }, request: { url: 'secret' }, contexts: { device: { name: 'secret' } }, breadcrumbs: [{ category: 'lock', message: 'secret' }], attachments: [{ filename: 'secret.txt' }], exception: { values: [{ type: 'TypeError', value: 'rule 12 could not be written', stacktrace }] }, extra: { generation: 2, reason: 'free text with pii', email: 'x' }, tags: { environment: 'preview', secret: 'x' } })).toEqual(expect.objectContaining({ message: undefined, logentry: undefined, user: undefined, request: undefined, contexts: undefined, breadcrumbs: undefined, attachments: undefined, exception: { values: [{ type: 'TypeError', value: 'rule 12 could not be written', stacktrace: { frames: [expect.objectContaining({ filename: 'app.js', lineno: 4 })] } }] }, extra: { generation: 2 }, tags: { environment: 'preview', runtime_version: 'runtime-1', update_id: 'update-1' } }));
  expect(scrubSentryBreadcrumb({ category: 'http', message: 'url' })).toBeNull();
});
test('keeps redacting exception text the SDK synthesized from a non-Error capture', () => {
  expect(scrubSentryEvent({ exception: { values: [{ type: 'Error', value: 'Object captured as exception with keys: email', mechanism: { type: 'generic', handled: true, synthetic: true } }] } }).exception).toEqual({ values: [{ type: 'Error', value: '[redacted]', stacktrace: undefined }] });
});
test('initializes at most once and stays disabled without a DSN', () => {
  resetSentryInitializationForTests(); const init = jest.fn(); const metadata = { version: '1.2.3', build: '42', environment: 'preview' };
  expect(initializeSentryOnce(init, undefined, metadata)).toBe(false);
  expect(initializeSentryOnce(init, 'dsn', metadata)).toBe(true);
  expect(initializeSentryOnce(init, 'dsn', metadata)).toBe(false);
  expect(init).toHaveBeenCalledTimes(1);
});
