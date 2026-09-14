jest.mock('../productionRuntime', () => ({ getProductionRuntime: jest.fn(async () => ({ kind: 'real' })) }));
import { runtimeMode } from '../environment';
import { createRuntime } from '../createRuntime';
test('uses the local fake runtime by default', () => {
  expect(createRuntime().kind).toBe('fake');
});
test('real mode uses the asynchronous production owner, never fake services', async () => {
  await expect(createRuntime('real')).resolves.toMatchObject({ kind: 'real' });
});

test('preview and production never activate demo services, even under Metro', () => {
  expect(runtimeMode('preview', true)).toBe('real');
  expect(runtimeMode('prod', true)).toBe('real');
  expect(runtimeMode('prod', false)).toBe('real');
});
test('only an explicit development context enables demo services', () => {
  expect(runtimeMode('dev', true)).toBe('fake');
  expect(runtimeMode(undefined, true)).toBe('fake');
  expect(() => runtimeMode('dev', false)).toThrow('release build');
  expect(() => runtimeMode(undefined, false)).toThrow('release build');
  expect(() => runtimeMode('unknown', true)).toThrow('environment');
});
test('the standalone lab research environment always boots the real runtime', () => {
  // Regression: the lab research build is a Release artifact with an embedded
  // bundle. It previously required EXCERLOCK_ENV=dev and threw here for every
  // non-__DEV__ build, so it could only ever run behind Metro.
  expect(runtimeMode('lab', false)).toBe('real');
  // Even a lab development build must not silently boot demo/fake services
  // when the operator asked for a real research trace.
  expect(runtimeMode('lab', true)).toBe('real');
});
