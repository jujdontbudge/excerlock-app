jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AsyncStorageGymVisitLog,
  GYM_VISIT_LOG_ACCEPTANCE_KEY,
  GYM_VISIT_LOG_STORAGE_KEY,
  resumeGymVisitLogWrites,
  suspendGymVisitLogWritesAndReset,
} from '../AsyncStorageGymVisitLog';
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

  it('shares one barrier so reset lands after a paused append from another instance', async () => {
    const taskLog = new AsyncStorageGymVisitLog();
    const foregroundLog = new AsyncStorageGymVisitLog();
    let release!: () => void;
    const paused = new Promise<void>((resolve) => { release = resolve; });
    const originalSetItem = AsyncStorage.setItem;
    AsyncStorage.setItem = jest.fn(async (key, value) => {
      if (key === GYM_VISIT_LOG_STORAGE_KEY) await paused;
      return originalSetItem(key, value);
    });

    const append = taskLog.append({ id: 'late', regionId: 'gym-a', type: 'enter', atMs: 1, receivedAtMs: 2 });
    await Promise.resolve();
    const reset = foregroundLog.reset();
    release();
    await Promise.all([append, reset]);

    expect(await AsyncStorage.getItem(GYM_VISIT_LOG_STORAGE_KEY)).toBeNull();
    AsyncStorage.setItem = originalSetItem;
  });

  it('durably rejects late task events until explicit next-account resumption', async () => {
    const taskLog = new AsyncStorageGymVisitLog();
    await suspendGymVisitLogWritesAndReset();
    expect(await AsyncStorage.getItem(GYM_VISIT_LOG_ACCEPTANCE_KEY)).toBe('suspended');
    await taskLog.append({ id: 'deleted-account', regionId: 'gym-a', type: 'exit', atMs: 3, receivedAtMs: 4 });
    expect(await AsyncStorage.getItem(GYM_VISIT_LOG_STORAGE_KEY)).toBeNull();

    await resumeGymVisitLogWrites();
    await taskLog.append({ id: 'next-account', regionId: 'gym-b', type: 'enter', atMs: 5, receivedAtMs: 6 });
    await expect(taskLog.readAll()).resolves.toEqual([
      { id: 'next-account', regionId: 'gym-b', type: 'enter', atMs: 5, receivedAtMs: 6 },
    ]);
  });
});
