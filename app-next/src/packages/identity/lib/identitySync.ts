import type { AuthIdentity } from '../../ports/AuthPort';
import type { Unsubscribe } from '../../model/models';
import type { RunIdentityOperation } from '../identityBarrier';

export type IdentitySyncDeps = {
  getIdentity(): AuthIdentity;
  subscribeIdentity(callback: (identity: AuthIdentity) => void): Unsubscribe;
  prepareAccount?(identity: AuthIdentity): Promise<void>;
  subscriptionIdentify(userId: string): Promise<void>;
  markReady(identity: AuthIdentity): void;
  afterReady(identity: AuthIdentity): Promise<void>;
  runIdentityOperation: RunIdentityOperation;
  reportError(error: unknown): void;
};

const keyOf = (identity: AuthIdentity) =>
  identity.kind === 'canonical' && identity.userId ? `${identity.generation}:${identity.userId}` : null;

export function startIdentitySync(deps: IdentitySyncDeps) {
  let readyKey: string | null = null;
  let running: { key: string; run: Promise<void> } | null = null;
  let disposed = false;
  const wakers = new Set<() => void>();
  const wake = () => [...wakers].forEach((waker) => waker());
  const current = (key: string) => !disposed && keyOf(deps.getIdentity()) === key;

  const sync = (identity: AuthIdentity): Promise<void> => {
    const key = keyOf(identity);
    if (!key || key === readyKey || disposed) return Promise.resolve();
    if (running?.key === key) return running.run;
    const run = deps.runIdentityOperation(async () => {
      if (!current(key)) return;
      await deps.prepareAccount?.(identity);
      if (!current(key)) return;
      await deps.subscriptionIdentify(identity.userId!);
      if (!current(key)) return;
      readyKey = key;
      deps.markReady(identity);
      wake();
      void deps.afterReady(identity).catch((error: unknown) => deps.reportError(error));
    }).catch((error: unknown) => deps.reportError(error)).finally(() => {
      if (running?.run === run) running = null;
    });
    running = { key, run };
    return run;
  };

  const unsubscribe = deps.subscribeIdentity((identity) => {
    if (keyOf(identity) !== readyKey) readyKey = null;
    wake();
    setTimeout(() => void sync(identity), 0);
  });
  setTimeout(() => void sync(deps.getIdentity()), 0);

  const pause = (ms: number) => new Promise<void>((resolve) => {
    const done = () => {
      clearTimeout(timer);
      wakers.delete(done);
      resolve();
    };
    const timer = setTimeout(done, ms);
    wakers.add(done);
  });

  return {
    async waitForReady(timeoutMs = 15_000): Promise<AuthIdentity> {
      const deadline = Date.now() + timeoutMs;
      while (!disposed && Date.now() < deadline) {
        const identity = deps.getIdentity();
        const key = keyOf(identity);
        if (key && key === readyKey) return { ...identity, ready: true };
        if (identity.kind === 'deleting') throw new Error('Identity is deleting; purchases are disabled');
        if (key) await sync(identity);
        if (key && key === readyKey && current(key)) continue;
        await pause(Math.max(0, Math.min(1000, deadline - Date.now())));
      }
      throw new Error(`Identity not ready within ${timeoutMs}ms`);
    },
    dispose() {
      disposed = true;
      unsubscribe();
      wake();
    },
  };
}
