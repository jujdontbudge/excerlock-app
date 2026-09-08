import AsyncStorage from '@react-native-async-storage/async-storage';
import { ruleDaysStore } from '../ruleDaysStore';

test('earnedUnlocks is absent-means-empty and validates persisted records', async () => {
  await AsyncStorage.setItem(
    'excerlock-next.ruleDays.v1',
    JSON.stringify({ state: { data: { days: [], walkingSession: null } }, version: 0 }),
  );
  await ruleDaysStore.persist.rehydrate();
  expect(ruleDaysStore.getState().data.earnedUnlocks).toEqual([]);

  const record = {
    day: '2026-09-07',
    ruleId: 'walk',
    ruleName: 'Walk 5,000 steps',
    metAt: '2026-09-07T10:00:00.000Z',
    windowEnd: '2026-09-07T21:00:00.000Z',
  };
  ruleDaysStore.getState().patch({ earnedUnlocks: [record] });
  expect(ruleDaysStore.getState().data.earnedUnlocks).toEqual([record]);
  ruleDaysStore.getState().patch({ earnedUnlocks: [{ ...record, metAt: 'invalid' }] });
  expect(ruleDaysStore.getState().data.earnedUnlocks).toEqual([record]);
});
