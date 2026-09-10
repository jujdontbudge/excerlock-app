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
