import { activityTruthStore, currentActivityTruth, ACTIVITY_TRUTH_TTL_MS } from '../activityTruthStore';

const NOW = Date.parse('2026-09-18T10:15:00.000Z');

beforeEach(() => activityTruthStore.getState().clear());

test('holding a chip records one active label with its time; a second hold replaces it', () => {
  activityTruthStore.getState().hold('walking', NOW);
  expect(activityTruthStore.getState().data).toEqual({ activity: 'walking', heldAt: NOW });
  activityTruthStore.getState().hold('shaking', NOW + 1_000);
  expect(activityTruthStore.getState().data).toEqual({ activity: 'shaking', heldAt: NOW + 1_000 });
  activityTruthStore.getState().clear();
  expect(activityTruthStore.getState().data).toBeNull();
});

test('a held label is reported with its age and goes stale after the TTL', () => {
  expect(currentActivityTruth(NOW)).toBeNull();
  activityTruthStore.getState().hold('treadmill', NOW - 30_000);
  expect(currentActivityTruth(NOW)).toEqual({ activity: 'treadmill', heldAt: '2026-09-18T10:14:30.000Z', ageSeconds: 30 });
  expect(currentActivityTruth(NOW + ACTIVITY_TRUTH_TTL_MS)).toBeNull();
});
