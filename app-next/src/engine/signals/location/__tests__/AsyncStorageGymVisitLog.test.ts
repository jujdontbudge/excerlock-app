jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AsyncStorageGymVisitLog, GYM_VISIT_LOG_STORAGE_KEY } from '../AsyncStorageGymVisitLog';
describe('AsyncStorageGymVisitLog', () => {
  beforeEach(async () => AsyncStorage.clear());
  it('persists coordinate-free raw records and deduplicates callback delivery', async () => {
    const log = new AsyncStorageGymVisitLog();
    const record = { id: 'a:enter:1000', regionId: 'gym-a', type: 'enter' as const, atMs: 1_000, receivedAtMs: 1_005 };
    await log.append(record);
    await log.append(record);
    await expect(log.readAll()).resolves.toEqual([record]);
    const stored = await AsyncStorage.getItem(GYM_VISIT_LOG_STORAGE_KEY);
    expect(stored).not.toMatch(/lat|lon|radius|coordinate/i);
  });
});
