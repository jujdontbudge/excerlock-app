import AsyncStorage from '@react-native-async-storage/async-storage';
import { AsyncStorageGymVisitLog, GYM_VISIT_LOG_STORAGE_KEY, LEGACY_GYM_VISIT_LOG_STORAGE_KEY } from '../../engine/signals/location/AsyncStorageGymVisitLog';
import { detectionStore } from '../../state/detectionStore';
import { permissionsStore } from '../../state/permissionsStore';
import { profileStore } from '../../state/profileStore';
import { HistoryCreditLedger } from '../detection/HistoryCreditLedger';
import { eraseProductionData } from '../eraseProductionData';

beforeEach(async () => { await AsyncStorage.clear(); });

test('erases owned stores and durable detection artifacts while preserving actual OS permission projection', async () => {
  profileStore.getState().patch({ name: 'Private Name' });
  permissionsStore.getState().patch({ motion: 'denied', screenTime: 'granted' });
  detectionStore.getState().patch({ generation: 4, observedAt: 100 });
  const historyLedger = new HistoryCreditLedger(AsyncStorage);
  await historyLedger.apply({ idempotencyKey: 'one', from: 0, to: 1000, steps: 10 }, 'UTC');
  const gymLog = new AsyncStorageGymVisitLog();
  await gymLog.append({ id: 'visit', regionId: 'gym', type: 'enter', atMs: 1, receivedAtMs: 1 });
  await AsyncStorage.setItem(LEGACY_GYM_VISIT_LOG_STORAGE_KEY, JSON.stringify([{ regionId: 'old', atMs: 1 }]));

  await eraseProductionData({
    historyLedger,
    gymLog,
    permissions: { screenTime: 'granted', motion: 'denied', location: 'always', camera: 'denied', notifications: 'granted' },
    now: 200,
  });

  expect(profileStore.getState().data.name).toBe('');
  expect(permissionsStore.getState().data).toEqual({ screenTime: 'granted', motion: 'denied', location: 'always', camera: 'denied', notifications: 'granted' });
  expect(detectionStore.getState().data).toMatchObject({ generation: 5, observedAt: 200, creditedThrough: {}, pendingHistory: null });
  await expect(historyLedger.read()).resolves.toEqual({
    version: 1, through: null, stepsByDay: {}, instanceMeasurements: {},
  });
  await expect(AsyncStorage.getItem(GYM_VISIT_LOG_STORAGE_KEY)).resolves.toBeNull();
  await expect(AsyncStorage.getItem(LEGACY_GYM_VISIT_LOG_STORAGE_KEY)).resolves.toBeNull();
});
