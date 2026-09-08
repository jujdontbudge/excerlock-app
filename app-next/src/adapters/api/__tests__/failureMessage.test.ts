import { ApiError, apiFailureMessage } from '..';

const copy = { offline: 'offline', timeout: 'timeout', rejected: 'rejected', fallback: 'fallback' };
const online = { isOnline: async () => true };
const offline = { isOnline: async () => false };

test('a typed API error picks its own sentence', async () => {
  expect(await apiFailureMessage(new ApiError('offline'), online, copy)).toBe('offline');
  expect(await apiFailureMessage(new ApiError('timeout'), online, copy)).toBe('timeout');
  expect(await apiFailureMessage(new ApiError('rejected', 400), online, copy)).toBe('rejected');
  expect(await apiFailureMessage(new ApiError('unavailable', 503), online, copy)).toBe('fallback');
  expect(await apiFailureMessage(new ApiError('unauthenticated'), offline, copy)).toBe('fallback');
});

test('an untyped error still lets offline win over the generic sentence', async () => {
  expect(await apiFailureMessage(new Error('x'), offline, copy)).toBe('offline');
  expect(await apiFailureMessage(new Error('x'), online, copy)).toBe('fallback');
});
