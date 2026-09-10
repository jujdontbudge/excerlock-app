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
