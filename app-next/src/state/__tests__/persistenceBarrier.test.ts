import AsyncStorage from '@react-native-async-storage/async-storage';
import { createPersistedStore } from '../createPersistedStore';

test('reset persistence queues behind an older write and barrier observes final reset', async () => {
  let release!: () => void;
  const first = new Promise<void>((resolve) => { release = resolve; });
  const writes: string[] = [];
  const spy = jest.spyOn(AsyncStorage, 'setItem')
    .mockImplementationOnce(async (_key, value) => { writes.push(value); await first; })
    .mockImplementation(async (_key, value) => { writes.push(value); });
  const store = createPersistedStore('barrier-order', { value: 0 }, { value: Number.isFinite });
  store.getState().patch({ value: 7 });
  store.getState().reset();
  const barrier = store.persistBarrier();
  await Promise.resolve();
  expect(writes).toHaveLength(1);
  release();
  await barrier;
  expect(JSON.parse(writes.at(-1)!).state.data).toEqual({ value: 0 });
  spy.mockRestore();
});

test('barrier surfaces a failed write and a later reset retries on the same key', async () => {
  const spy = jest.spyOn(AsyncStorage, 'setItem')
    .mockRejectedValueOnce(new Error('disk full'))
    .mockResolvedValue(undefined);
  const store = createPersistedStore('barrier-retry', { value: 0 }, { value: Number.isFinite });
  store.getState().reset();
  await expect(store.persistBarrier()).rejects.toThrow('disk full');
  store.getState().reset();
  await expect(store.persistBarrier()).resolves.toBeUndefined();
  expect(spy).toHaveBeenCalledTimes(2);
  spy.mockRestore();
});

test('explicit retry persists the exact latest failed snapshot after storage recovers', async () => {
  const writes: string[] = [];
  const spy = jest.spyOn(AsyncStorage, 'setItem')
    .mockRejectedValueOnce(new Error('disk full'))
    .mockImplementation(async (_key, value) => { writes.push(value); });
  const store = createPersistedStore('explicit-retry', { value: 0 }, { value: Number.isFinite });
  store.getState().patch({ value: 7 });
  await expect(store.persistBarrier()).rejects.toThrow('disk full');
  await expect(store.persistBarrier()).rejects.toThrow('disk full');
  expect(spy).toHaveBeenCalledTimes(1);
  await expect(store.retryPersistence()).resolves.toBeUndefined();
  expect(JSON.parse(writes[0]).state.data).toEqual({ value: 7 });
  await expect(store.retryPersistence()).resolves.toBeUndefined();
  expect(spy).toHaveBeenCalledTimes(2);
  spy.mockRestore();
});

test('a newer pending snapshot dominates an older failure', async () => {
  let release!: () => void;
  const newer = new Promise<void>((resolve) => { release = resolve; });
  const writes: string[] = [];
  const spy = jest.spyOn(AsyncStorage, 'setItem')
    .mockRejectedValueOnce(new Error('old failed'))
    .mockImplementationOnce(async (_key, value) => { writes.push(value); await newer; });
  const store = createPersistedStore('newer-dominates', { value: 0 }, { value: Number.isFinite });
  store.getState().patch({ value: 1 });
  await expect(store.persistBarrier()).rejects.toThrow('old failed');
  store.getState().patch({ value: 2 });
  const retry = store.retryPersistence();
  await Promise.resolve();
  expect(spy).toHaveBeenCalledTimes(2);
  release();
  await retry;
  expect(JSON.parse(writes.at(-1)!).state.data).toEqual({ value: 2 });
  expect(spy).toHaveBeenCalledTimes(2);
  spy.mockRestore();
});

test('failed removal retries in order and cannot erase a newer reset', async () => {
  const calls: string[] = [];
  const remove = jest.spyOn(AsyncStorage, 'removeItem')
    .mockImplementationOnce(async () => { calls.push('remove-failed'); throw new Error('remove failed'); })
    .mockImplementation(async () => { calls.push('remove-retry'); });
  const set = jest.spyOn(AsyncStorage, 'setItem').mockImplementation(async (_key, value) => {
    calls.push(`set:${JSON.parse(value).state.data.value}`);
  });
  const store = createPersistedStore('remove-order', { value: 0 }, { value: Number.isFinite });
  store.persist.clearStorage();
  await expect(store.persistBarrier()).rejects.toThrow('remove failed');
  store.getState().reset();
  await store.retryPersistence();
  await store.persistBarrier();
  expect(calls).toEqual(['remove-failed', 'set:0']);
  expect(remove).toHaveBeenCalledTimes(1);
  remove.mockRestore();
  set.mockRestore();
});

test('a repeated failed retry remains visible through the barrier', async () => {
  const spy = jest.spyOn(AsyncStorage, 'setItem').mockRejectedValue(new Error('still full'));
  const store = createPersistedStore('retry-failure', { value: 0 }, { value: Number.isFinite });
  store.getState().patch({ value: 9 });
  await expect(store.persistBarrier()).rejects.toThrow('still full');
  await expect(store.retryPersistence()).rejects.toThrow('still full');
  await expect(store.persistBarrier()).rejects.toThrow('still full');
  expect(spy).toHaveBeenCalledTimes(2);
  spy.mockRestore();
});
