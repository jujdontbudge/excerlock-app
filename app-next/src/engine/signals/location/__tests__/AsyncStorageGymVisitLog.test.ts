jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AsyncStorageGymVisitLog,
  GYM_VISIT_LOG_ACCEPTANCE_KEY,
  GYM_VISIT_LOG_STORAGE_KEY,
  GYM_VISIT_LOG_PRUNED_THROUGH_KEY,
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
    expect(JSON.parse((await AsyncStorage.getItem(GYM_VISIT_LOG_ACCEPTANCE_KEY))!)).toEqual({ epoch: 1, regionIds: [] });
    await taskLog.append({ id: 'deleted-account', regionId: 'gym-a', type: 'exit', atMs: 3, receivedAtMs: 4 });
    expect(await AsyncStorage.getItem(GYM_VISIT_LOG_STORAGE_KEY)).toBeNull();

    await resumeGymVisitLogWrites(['gym-b']);
    await taskLog.append({ id: 'old-late', regionId: 'gym-a', type: 'exit', atMs: 4, receivedAtMs: 5 });
    await taskLog.append({ id: 'next-account', regionId: 'gym-b', type: 'enter', atMs: 5, receivedAtMs: 6 });
    await expect(taskLog.readAll()).resolves.toEqual([
      { id: 'next-account', regionId: 'gym-b', type: 'enter', atMs: 5, receivedAtMs: 6 },
    ]);
  });
  it('prunes sealed transitions while retaining open boundaries and a late-event cursor', async () => {
    const log = new AsyncStorageGymVisitLog();
    await Promise.all([
      log.append({ id: 'closed-enter', regionId: 'closed', type: 'enter', atMs: 1, receivedAtMs: 1 }),
      log.append({ id: 'closed-exit', regionId: 'closed', type: 'exit', atMs: 2, receivedAtMs: 2 }),
      log.append({ id: 'open-enter', regionId: 'open', type: 'enter', atMs: 3, receivedAtMs: 3 }),
      log.append({ id: 'recent', regionId: 'recent', type: 'enter', atMs: 20, receivedAtMs: 20 }),
    ]);
    await expect(log.pruneBefore(10)).resolves.toEqual([
      expect.objectContaining({ id: 'open-enter' }), expect.objectContaining({ id: 'recent' }),
    ]);
    expect(await AsyncStorage.getItem(GYM_VISIT_LOG_PRUNED_THROUGH_KEY)).toBe('10');
    await log.append({ id: 'late-old', regionId: 'closed', type: 'exit', atMs: 2, receivedAtMs: 30 });
    expect((await log.readAll()).map(({ id }) => id)).toEqual(['open-enter', 'recent']);
  });
  it('advances the cursor before compaction so a failed write cannot replay sealed events', async () => {
    const log = new AsyncStorageGymVisitLog();
    await log.append({ id: 'old-in', regionId: 'closed', type: 'enter', atMs: 1, receivedAtMs: 1 });
    await log.append({ id: 'old-out', regionId: 'closed', type: 'exit', atMs: 2, receivedAtMs: 2 });
    const originalSetItem = AsyncStorage.setItem;
    AsyncStorage.setItem = jest.fn(async (key, value) => {
      if (key === GYM_VISIT_LOG_STORAGE_KEY) throw new Error('disk');
      return originalSetItem(key, value);
    });
    await expect(log.pruneBefore(10)).rejects.toThrow('disk');
    AsyncStorage.setItem = originalSetItem;
    expect(await AsyncStorage.getItem(GYM_VISIT_LOG_PRUNED_THROUGH_KEY)).toBe('10');
    await log.append({ id: 'late-replay', regionId: 'closed', type: 'exit', atMs: 2, receivedAtMs: 20 });
    expect(await log.readAll()).toEqual([]);
  });
  it('never regresses a durable cutoff and applies the effective boundary', async () => {
    const log = new AsyncStorageGymVisitLog();
    await log.append({ id: 'open', regionId: 'open', type: 'enter', atMs: 15, receivedAtMs: 15 });
    await log.append({ id: 'recent', regionId: 'recent', type: 'enter', atMs: 25, receivedAtMs: 25 });
    await log.pruneBefore(20);
    await expect(log.pruneBefore(10)).resolves.toEqual([
      expect.objectContaining({ id: 'open' }), expect.objectContaining({ id: 'recent' }),
    ]);
    expect(await AsyncStorage.getItem(GYM_VISIT_LOG_PRUNED_THROUGH_KEY)).toBe('20');
  });
  it('fails closed on a malformed retention cursor', async () => {
    const log = new AsyncStorageGymVisitLog();
    await AsyncStorage.setItem(GYM_VISIT_LOG_PRUNED_THROUGH_KEY, 'not-a-number');
    await expect(log.append({ id: 'unsafe', regionId: 'gym', type: 'enter', atMs: 20, receivedAtMs: 20 }))
      .rejects.toThrow('Invalid gym retention cursor');
    await expect(log.readAll()).rejects.toThrow('Invalid gym retention cursor');
    await expect(log.pruneBefore(30)).rejects.toThrow('Invalid gym retention cursor');
    expect(await AsyncStorage.getItem(GYM_VISIT_LOG_STORAGE_KEY)).toBeNull();
  });
});
