import { IdentityCoordinator } from '../identityCoordinator';
import { createIdentityBarrier } from '../identityBarrier';
import type { AuthIdentity } from '../../../ports/AuthPort';

function canonical(userId: string, generation = 0): AuthIdentity {
  return { kind: 'canonical', userId, isAnonymous: false, generation, ready: false };
}
function provisional(generation = 0): AuthIdentity {
  return { kind: 'provisional', userId: null, isAnonymous: true, generation, ready: false };
}

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

test('spine order is PUT -> analytics -> subscription -> integration, ready only at end', async () => {
  const order: string[] = [];
  const putGate = deferred<{ status: number }>();
  const analyticsGate = deferred<void>();
  const subscriptionGate = deferred<void>();
  const integrationGate = deferred<void>();
  let current: AuthIdentity = canonical('uid-order');
  const listeners = new Set<(i: AuthIdentity) => void>();
  const coordinator = new IdentityCoordinator({
    getIdentity: () => current,
    subscribeIdentity: (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    getAuthContext: async () => ({ accessToken: 'token-123', userId: 'uid-order', generation: 0 }),
    putUser: async () => {
      order.push('put');
      return putGate.promise;
    },
    analyticsIdentify: async () => {
      order.push('analytics');
      return analyticsGate.promise;
    },
    subscriptionIdentify: async () => {
      order.push('subscription');
      return subscriptionGate.promise;
    },
    attachIntegration: async () => {
      order.push('integration');
      return integrationGate.promise;
    },
  });
  coordinator.start();
  // Allow start() deferred processing to begin spine (put called).
  await new Promise((r) => setTimeout(r, 10));
  expect(order).toEqual(['put']);
  expect(coordinator.isReady()).toBe(false);
  // Ready gate must remain pending through each await.
  let readyResolved = false;
  const readyPromise = coordinator.waitForIdentityReady({ timeoutMs: 2000 }).then(
    (v) => {
      readyResolved = true;
      return v;
    },
    (e) => {
      throw e;
    },
  );
  putGate.resolve({ status: 200 });
  await new Promise((r) => setTimeout(r, 10));
  expect(order).toEqual(['put', 'analytics']);
  expect(coordinator.isReady()).toBe(false);
  expect(readyResolved).toBe(false);
  analyticsGate.resolve();
  await new Promise((r) => setTimeout(r, 10));
  expect(order).toEqual(['put', 'analytics', 'subscription']);
  expect(coordinator.isReady()).toBe(false);
  expect(readyResolved).toBe(false);
  subscriptionGate.resolve();
  await new Promise((r) => setTimeout(r, 10));
  expect(order).toEqual(['put', 'analytics', 'subscription', 'integration']);
  expect(coordinator.isReady()).toBe(false);
  integrationGate.resolve();
  const ready = await readyPromise;
  expect(readyResolved).toBe(true);
  expect(coordinator.isReady()).toBe(true);
  expect(ready.ready).toBe(true);
  expect(ready.userId).toBe('uid-order');
  coordinator.dispose();
});

test('fresh unchanged identity does not repeatedly identify', async () => {
  let putCount = 0;
  let analyticsCount = 0;
  let subscriptionCount = 0;
  let current: AuthIdentity = canonical('uid-same');
  const listeners = new Set<(i: AuthIdentity) => void>();
  const emit = (next: AuthIdentity) => {
    current = next;
    for (const cb of [...listeners]) cb(next);
  };
  const coordinator = new IdentityCoordinator({
    getIdentity: () => current,
    subscribeIdentity: (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    getAuthContext: async () => ({ accessToken: 't', userId: 'uid-same', generation: 0 }),
    putUser: async () => {
      putCount += 1;
      return { status: 200 };
    },
    analyticsIdentify: async () => {
      analyticsCount += 1;
    },
    subscriptionIdentify: async () => {
      subscriptionCount += 1;
    },
    attachIntegration: async () => {},
  });
  coordinator.start();
  await new Promise((r) => setTimeout(r, 30));
  expect(putCount).toBe(1);
  // Re-emit same identity (same generation+uid): must not re-run.
  emit({ ...canonical('uid-same'), ready: true });
  await new Promise((r) => setTimeout(r, 30));
  expect(putCount).toBe(1);
  expect(analyticsCount).toBe(1);
  expect(subscriptionCount).toBe(1);
  coordinator.dispose();
});

test('PUT 410 triggers tombstone and never becomes ready', async () => {
  let tombstoned: string | null = null;
  let ready = false;
  const current: AuthIdentity = canonical('uid-tomb');
  const coordinator = new IdentityCoordinator({
    getIdentity: () => current,
    subscribeIdentity: () => () => undefined,
    getAuthContext: async () => ({ accessToken: 't', userId: 'uid-tomb', generation: 0 }),
    putUser: async () => ({ status: 410 }),
    analyticsIdentify: async () => {
      throw new Error('must not identify tombstoned');
    },
    subscriptionIdentify: async () => {
      throw new Error('must not identify tombstoned');
    },
    attachIntegration: async () => {},
    onTombstone: async (uid) => {
      tombstoned = uid;
    },
    onReady: () => {
      ready = true;
    },
  });
  coordinator.start();
  await new Promise((r) => setTimeout(r, 30));
  expect(tombstoned).toBe('uid-tomb');
  expect(coordinator.isReady()).toBe(false);
  expect(ready).toBe(false);
  coordinator.dispose();
});

test('PUT 503 and identify failures remain unready with visible retry', async () => {
  let current: AuthIdentity = canonical('uid-retry');
  let putStatus = 503;
  const coordinator = new IdentityCoordinator({
    getIdentity: () => current,
    subscribeIdentity: () => () => undefined,
    getAuthContext: async () => ({ accessToken: 't', userId: 'uid-retry', generation: 0 }),
    putUser: async () => ({ status: putStatus }),
    analyticsIdentify: async () => {},
    subscriptionIdentify: async () => {},
    attachIntegration: async () => {},
  });
  coordinator.start();
  await new Promise((r) => setTimeout(r, 30));
  expect(coordinator.isReady()).toBe(false);
  // Retry after server recovers.
  putStatus = 200;
  await coordinator.retry();
  await new Promise((r) => setTimeout(r, 30));
  expect(coordinator.isReady()).toBe(true);
  coordinator.dispose();
});

test('generation change abandons stale spine without marking ready', async () => {
  const putGate = deferred<{ status: number }>();
  let gen = 0;
  const analyticsIdentify = jest.fn(async () => {});
  const currentFor = (): AuthIdentity => canonical('uid-stale', gen);
  const coordinator = new IdentityCoordinator({
    getIdentity: () => currentFor(),
    subscribeIdentity: () => () => undefined,
    getAuthContext: async () => ({ accessToken: 't', userId: 'uid-stale', generation: gen }),
    putUser: async () => putGate.promise,
    analyticsIdentify,
    subscriptionIdentify: async () => {},
    attachIntegration: async () => {},
  });
  coordinator.start();
  await new Promise((r) => setTimeout(r, 10));
  // Change generation before PUT resolves (simulates delete/signout).
  gen = 1;
  putGate.resolve({ status: 200 });
  await new Promise((r) => setTimeout(r, 30));
  expect(coordinator.isReady()).toBe(false);
  expect(analyticsIdentify).not.toHaveBeenCalled();
  coordinator.dispose();
  void provisional;
});

test('one global barrier prevents old and new account vendor transitions from overlapping', async () => {
  const oldAnalytics = deferred<void>();
  const calls: string[] = [];
  let current: AuthIdentity = canonical('old', 0);
  const listeners = new Set<(identity: AuthIdentity) => void>();
  const coordinator = new IdentityCoordinator({
    getIdentity: () => current,
    subscribeIdentity: (callback) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    getAuthContext: async () => ({ accessToken: 'token', userId: current.userId!, generation: current.generation }),
    putUser: async ({ userId }) => {
      calls.push(`put:${userId}`);
      return { status: 200 };
    },
    analyticsIdentify: async (userId) => {
      calls.push(`analytics:${userId}`);
      if (userId === 'old') await oldAnalytics.promise;
    },
    subscriptionIdentify: async (userId) => {
      calls.push(`subscription:${userId}`);
    },
    attachIntegration: async (userId) => {
      calls.push(`integration:${userId}`);
    },
    runIdentityOperation: createIdentityBarrier(),
  });
  coordinator.start();
  await new Promise((resolve) => setTimeout(resolve, 10));
  current = canonical('new', 1);
  for (const listener of listeners) listener(current);
  await new Promise((resolve) => setTimeout(resolve, 10));
  expect(calls).toEqual(['put:old', 'analytics:old']);
  oldAnalytics.resolve();
  await new Promise((resolve) => setTimeout(resolve, 30));
  expect(calls).not.toContain('subscription:old');
  expect(calls).toEqual([
    'put:old',
    'analytics:old',
    'put:new',
    'analytics:new',
    'subscription:new',
    'integration:new',
  ]);
  coordinator.dispose();
});

test('stale 410 after account switch cannot tombstone the new account', async () => {
  const put = deferred<{ status: number }>();
  let current: AuthIdentity = canonical('old', 0);
  const onTombstone = jest.fn(async () => {});
  const coordinator = new IdentityCoordinator({
    getIdentity: () => current,
    subscribeIdentity: () => () => undefined,
    getAuthContext: async () => ({ accessToken: 'old-token', userId: 'old', generation: 0 }),
    putUser: async () => put.promise,
    analyticsIdentify: async () => {},
    subscriptionIdentify: async () => {},
    attachIntegration: async () => {},
    onTombstone,
  });
  coordinator.start();
  await new Promise((resolve) => setTimeout(resolve, 10));
  current = canonical('new', 1);
  put.resolve({ status: 410 });
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(onTombstone).not.toHaveBeenCalled();
  coordinator.dispose();
});

test('deleting transition revokes cached readiness and disposal rejects waiters', async () => {
  let current: AuthIdentity = canonical('uid', 0);
  const listeners = new Set<(identity: AuthIdentity) => void>();
  const coordinator = new IdentityCoordinator({
    getIdentity: () => current,
    subscribeIdentity: (callback) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    getAuthContext: async () => ({ accessToken: 'token', userId: 'uid', generation: 0 }),
    putUser: async () => ({ status: 200 }),
    analyticsIdentify: async () => {},
    subscriptionIdentify: async () => {},
    attachIntegration: async () => {},
  });
  coordinator.start();
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(coordinator.isReady()).toBe(true);
  current = { ...current, kind: 'deleting', ready: false };
  for (const listener of listeners) listener(current);
  expect(coordinator.isReady()).toBe(false);
  await expect(coordinator.waitForIdentityReady({ timeoutMs: 100 })).rejects.toThrow(/deleting/i);
  current = provisional(1);
  const waiting = coordinator.waitForIdentityReady({ timeoutMs: 1000 });
  coordinator.dispose();
  await expect(waiting).rejects.toThrow(/disposed/i);
});
