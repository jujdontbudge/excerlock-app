import AsyncStorage from '@react-native-async-storage/async-storage';
import { createPersistedStore } from '../createPersistedStore';
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
