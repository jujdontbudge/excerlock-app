import AsyncStorage from '@react-native-async-storage/async-storage';
import { MIN_WINDOW_MINUTES } from '../../domain/validateRule';
import { rulesStore } from '../rulesStore';
import { rule as fixture } from '../../domain/__tests__/fixtures';

beforeEach(async () => {
  await AsyncStorage.clear();
});

// Audit #97: a persisted 15–29-minute window is widened on load, never dropped with the rest of the rules.
test('a persisted 20-minute window hydrates widened to the minimum instead of dropping every rule', async () => {
  const rule = { ...fixture, schedule: { ...fixture.schedule, window: { kind: 'range', startMinute: 540, endMinute: 560 } } };
  await AsyncStorage.setItem(
    'excerlock-next.rules.v1',
    JSON.stringify({
      state: { data: { rules: [rule], lockedApps: { handle: null, appCount: 0, categoryCount: 0 } } },
      version: 1,
    }),
  );

  await rulesStore.persist.rehydrate();

  const { rules } = rulesStore.getState().data;
  expect(rules).toHaveLength(1);
  expect(rules[0].schedule.window).toEqual({ kind: 'range', startMinute: 540, endMinute: 540 + MIN_WINDOW_MINUTES });
});
