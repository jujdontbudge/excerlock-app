import { IdentityCoordinator } from '../identityCoordinator';
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
    getAccessToken: async () => 'token-123',
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
    getAccessToken: async () => 't',
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
  emit(canonical('uid-same'));
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
    getAccessToken: async () => 't',
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
    getAccessToken: async () => 't',
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
    getAccessToken: async () => 't',
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
