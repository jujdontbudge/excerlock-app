import { createRuntime } from '../createRuntime';
test('uses the local fake runtime by default', () => {
  expect(createRuntime().kind).toBe('fake');
});
test('does not silently activate real services in Phase 1', () => {
  expect(() => createRuntime('real')).toThrow('Phase 1');
});
