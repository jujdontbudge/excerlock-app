import { gymRulesToPause, gymRulesToResume, applyGymDependency } from '../gymDependency';
import { Rule } from '../types';
const base: Rule = {
  id: 'r1',
  activity: 'gym',
  mode: { kind: 'event', activity: 'gym', trigger: 'arrival' },
  schedule: { days: [1], window: { kind: 'allDay' } },
  enabled: true,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};
const walking: Rule = {
  ...base,
  id: 'r2',
  activity: 'walking',
  mode: { kind: 'state', activity: 'walking', place: 'outside' },
};
test('losing the last gym pauses every enabled gym rule and nothing else', () => {
  expect(gymRulesToPause([base, walking], []).map((r) => r.id)).toEqual(['r1']);
  expect(gymRulesToPause([base, walking], [{ id: 'g1' }])).toEqual([]);
});
test('a gym rule the user paused by hand is left alone', () => {
  expect(gymRulesToPause([{ ...base, enabled: false }], [])).toEqual([]);
});
test('saving a gym resumes only the rules paused for a missing gym', () => {
  const auto: Rule = { ...base, enabled: false, pausedReason: 'noGym' };
  const manual: Rule = { ...base, id: 'r3', enabled: false };
  expect(gymRulesToResume([auto, manual], [{ id: 'g1' }]).map((r) => r.id)).toEqual(['r1']);
  expect(gymRulesToResume([auto, manual], [])).toEqual([]);
});
test('applying the dependency is idempotent in both directions', () => {
  const paused = applyGymDependency([base, walking], []);
  expect(paused[0]).toMatchObject({ enabled: false, pausedReason: 'noGym' });
  expect(paused[1]).toBe(walking);
  expect(applyGymDependency(paused, [])).toEqual(paused);
  const resumed = applyGymDependency(paused, [{ id: 'g1' }]);
  expect(resumed[0]).toMatchObject({ enabled: true });
  expect(resumed[0].pausedReason ?? null).toBeNull();
});
