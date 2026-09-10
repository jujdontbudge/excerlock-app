import { NavigatorLockAcquireTimeoutError } from '@supabase/auth-js';
import { AuthSdkLifecycle } from '../authLifecycle';

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => { resolve = next; });
  return { promise, resolve };
};

test('auth lock is FIFO and drain includes queued work', async () => {
  const lifecycle = new AuthSdkLifecycle();
  const release = deferred<void>();
  const order: string[] = [];
  const first = lifecycle.lock('auth', -1, async () => {
    order.push('first-start');
    await release.promise;
    order.push('first-end');
  });
  const second = lifecycle.lock('auth', -1, async () => { order.push('second'); });
  for (let i = 0; i < 10 && !order.length; i++) await new Promise((resolve) => setTimeout(resolve, 0));
  lifecycle.closeLocks();
  const drained = lifecycle.drainLocks();
  expect(order).toEqual(['first-start']);
  release.resolve();
  await drained;
  await Promise.all([first, second]);
  expect(order).toEqual(['first-start', 'first-end', 'second']);
});

test('timeout zero never waits and positive timeout is respected', async () => {
  const lifecycle = new AuthSdkLifecycle();
  const release = deferred<void>();
  const held = lifecycle.lock('auth', -1, () => release.promise);
  await new Promise((resolve) => setTimeout(resolve, 0));
  await expect(lifecycle.lock('auth', 0, async () => undefined)).rejects.toMatchObject({ isAcquireTimeout: true });
  const timed = lifecycle.lock('auth', 20, async () => undefined);
  await expect(timed).rejects.toMatchObject({ isAcquireTimeout: true });
  release.resolve();
  await held;
});

test('late lock admission is rejected and invalidates the cleanup proof', async () => {
  const lifecycle = new AuthSdkLifecycle();
  lifecycle.closeLocks();
  await expect(lifecycle.lock('auth', -1, async () => undefined)).rejects.toBeInstanceOf(NavigatorLockAcquireTimeoutError);
  await expect(lifecycle.drainLocks()).rejects.toThrow(/after closure/);
});

test('a rejected operation is drained but is not a cleanup failure', async () => {
  const lifecycle = new AuthSdkLifecycle();
  await expect(lifecycle.run(async () => { throw new Error('network'); })).rejects.toThrow('network');
  lifecycle.closeCalls();
  await expect(lifecycle.drainCalls()).resolves.toBeUndefined();
});

test('application calls are fenced synchronously and drained', async () => {
  const lifecycle = new AuthSdkLifecycle();
  const release = deferred<void>();
  const running = lifecycle.run(() => release.promise);
  lifecycle.closeCalls();
  const drained = lifecycle.drainCalls();
  await expect(lifecycle.run(async () => undefined)).rejects.toThrow('closing');
  let done = false;
  void drained.then(() => { done = true; });
  await Promise.resolve();
  expect(done).toBe(false);
  release.resolve();
  await Promise.all([running, drained]);
  expect(done).toBe(true);
});
