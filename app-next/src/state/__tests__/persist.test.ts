import AsyncStorage from '@react-native-async-storage/async-storage';
import { defineStore } from '../createPersistedStore';
import { rule } from '../../domain/__tests__/fixtures';
import { rulesStore } from '../rulesStore';
import { ruleDaysStore } from '../ruleDaysStore';
import { hydrationReport, PersistError } from '../hydrationReport';
import * as v from '../validation';
import { isMetDay, streak } from '../../domain/streak';

beforeEach(async () => {
  await AsyncStorage.clear();
  hydrationReport.getState().clear();
});

test('a store written by the previous schema hydrates through its migration', async () => {
  const useStore = defineStore({
    name: 'migration-test',
    initial: { label: '', enabled: false },
    schemaVersion: 2,
    migrations: {
      1: (raw) => ({ ...(raw as { label: string }), enabled: true }),
    },
    validators: {
      label: (value) => typeof value === 'string',
      enabled: (value) => typeof value === 'boolean',
    },
  });
  await AsyncStorage.setItem(
    'excerlock-next.migration-test.v1',
    JSON.stringify({ state: { data: { label: 'Migrated' } }, version: 1 }),
  );

  await useStore.persist.rehydrate();

  expect(useStore.getState().data).toEqual({ label: 'Migrated', enabled: true });
});

test('one malformed rule row does not drop the other rows', async () => {
  await AsyncStorage.setItem(
    'excerlock-next.rules.v1',
    JSON.stringify({
      state: { data: { rules: [rule, { id: 42 }], lockedApps: { handle: null, appCount: 0, categoryCount: 0 } } },
      version: 1,
    }),
  );

  await rulesStore.persist.rehydrate();

  expect(rulesStore.getState().data.rules).toEqual([rule]);
  expect(rulesStore.getState().rejected).toEqual([{ id: 42 }]);
});

test('one malformed rule-day row does not drop the other met day or its streak', async () => {
  const metDay = {
    ruleId: rule.id,
    day: '2026-09-07',
    progress: 5000,
    met: true,
    metAt: '2026-09-07T14:45:00.000Z',
  };
  await AsyncStorage.setItem(
    'excerlock-next.ruleDays.v1',
    JSON.stringify({ state: { data: { days: [metDay, { day: false }], walkingSession: null } }, version: 1 }),
  );

  await ruleDaysStore.persist.rehydrate();

  expect(ruleDaysStore.getState().data.days).toEqual([metDay]);
  expect(ruleDaysStore.getState().rejected).toEqual([{ day: false }]);
  const met = isMetDay([rule], ruleDaysStore.getState().data.days, 0);
  expect(streak([{ day: metDay.day, scheduled: true, met }], metDay.day)).toEqual({ current: 1, longest: 1 });
});

test('hydrationReport counts every dropped row across the rules and ruleDays stores', async () => {
  await AsyncStorage.setItem(
    'excerlock-next.rules.v1',
    JSON.stringify({
      state: { data: { rules: [rule, { id: 42 }], lockedApps: { handle: null, appCount: 0, categoryCount: 0 } } },
      version: 1,
    }),
  );
  await AsyncStorage.setItem(
    'excerlock-next.ruleDays.v1',
    JSON.stringify({ state: { data: { days: [{ day: false }, { day: null }], walkingSession: null } }, version: 1 }),
  );

  await Promise.all([rulesStore.persist.rehydrate(), ruleDaysStore.persist.rehydrate()]);

  expect(hydrationReport.getState().droppedCount).toBe(3);
});

test('an added optional field does not invalidate persisted rows', async () => {
  const useStore = defineStore({
    name: 'optional-test',
    initial: { rows: [] as { id: string; note?: string }[] },
    schemaVersion: 1,
    migrations: { 0: (raw) => raw },
    validators: { rows: v.arrayOf(v.shape({ id: v.text, note: v.optional(v.text) })) },
  });
  await AsyncStorage.setItem(
    'excerlock-next.optional-test.v1',
    JSON.stringify({ state: { data: { rows: [{ id: 'old-row' }] } }, version: 1 }),
  );

  await useStore.persist.rehydrate();

  expect(useStore.getState().data.rows).toEqual([{ id: 'old-row' }]);
  expect(useStore.getState().rejected).toEqual([]);
});

test('a rejected AsyncStorage write surfaces an error instead of failing silently', async () => {
  const useStore = defineStore({
    name: 'write-test',
    initial: { enabled: false },
    schemaVersion: 1,
    migrations: { 0: (raw) => raw },
    validators: { enabled: v.bool },
  });
  const failure = new Error('disk unavailable');
  jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(failure);

  useStore.getState().patch({ enabled: true });
  await Promise.resolve();
  await Promise.resolve();

  expect(hydrationReport.getState().writeErrors).toEqual([expect.any(PersistError)]);
  expect(hydrationReport.getState().writeErrors[0]).toMatchObject({ storeName: 'write-test', cause: failure });
});
test('rehydration validates every field and cannot replace actions; valid edits survive restart', async () => {
  const useStore = defineStore({
    name: 'test',
    initial: { name: '', minutes: 180 },
    schemaVersion: 1,
    migrations: { 0: (raw) => raw },
    validators: {
      name: (v) => typeof v === 'string',
      minutes: (v) => typeof v === 'number' && v >= 0 && v <= 1440,
    },
  });
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
