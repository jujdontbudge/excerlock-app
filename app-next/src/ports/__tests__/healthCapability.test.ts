import { activities } from '../../content/activities';
import { createRuntime } from '../../runtime/createRuntime';
/**
 * B38 smoke test: the native HealthKit capability (entitlement, usage strings, pod,
 * background-delivery bridge) stays compiled — it lives in the old `app/` tree and moves
 * to app-next under T01, owned by the native porter — but no JavaScript product path may
 * read it. HealthPort and HealthFake are deleted; the runtime exposes no health member.
 */
test('the JavaScript product surface no longer reads HealthKit', () => {
  expect(activities.map((a) => a.id)).toEqual(['walking', 'gym']);
  expect(() => require('../HealthPort')).toThrow();
  const runtime = createRuntime();
  expect('health' in runtime).toBe(false);
  runtime.dispose();
});
