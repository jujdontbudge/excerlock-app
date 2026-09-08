import AsyncStorage from '@react-native-async-storage/async-storage';
import { createPersistedStore } from '../createPersistedStore';
import { rulesStore } from '../rulesStore';
test('rehydration validates every field and cannot replace actions; valid edits survive restart', async () => {
  const useStore = createPersistedStore(
    'test',
    { name: '', minutes: 180 },
    { name: (v) => typeof v === 'string', minutes: (v) => typeof v === 'number' && v >= 0 && v <= 1440 },
  );
  await AsyncStorage.setItem(
    'excerlock-next.test.v1',
    JSON.stringify({ state: { data: { name: 'Alex', minutes: 'oops' }, patch: 'broken' }, version: 0 }),
  );
  await useStore.persist.rehydrate();
  expect(useStore.getState().data).toEqual({ name: 'Alex', minutes: 180 });
  useStore.getState().patch({ minutes: 120 });
  await useStore.persist.rehydrate();
  expect(useStore.getState().data.minutes).toBe(120);
  useStore.getState().reset();
  expect(useStore.getState().data).toEqual({ name: '', minutes: 180 });
});
test('a persisted steps/treadmill rule hydrates as either instead of wiping the rules array', async () => {
  const treadmillSteps = {
    id: 'legacy',
    activity: 'walking',
    mode: { kind: 'target', activity: 'walking', metric: 'steps', goal: 6500, place: 'treadmill' },
    schedule: { days: [1], window: { kind: 'allDay' } },
    enabled: true,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  };
  const outside = { ...treadmillSteps, id: 'kept', mode: { ...treadmillSteps.mode, place: 'outside' } };
  await AsyncStorage.setItem(
    'excerlock-next.rules.v1',
    JSON.stringify({
      state: { data: { rules: [treadmillSteps, outside], lockedApps: { handle: null, appCount: 0, categoryCount: 0 } } },
      version: 0,
    }),
  );
  await rulesStore.persist.rehydrate();
  expect(rulesStore.getState().data.rules.map((rule) => rule.id)).toEqual(['legacy', 'kept']);
  expect(rulesStore.getState().data.rules[0].mode).toMatchObject({ metric: 'steps', place: 'either' });
});
