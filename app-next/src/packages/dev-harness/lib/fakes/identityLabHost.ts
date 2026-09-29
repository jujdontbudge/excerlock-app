import { FakeContext } from '../FakeContext';
import { createIdentityLab, type IdentityLab, type IdentityLabAccountHooks } from './IdentityLab';

type Method = (...args: unknown[]) => unknown;
const synchronous = new Set<PropertyKey>([
  'session',
  'identity',
  'subscribe',
  'subscribeIdentity',
  'dispose',
  'entitlement',
  'operation',
  'recovery',
  'subscribeRecovery',
]);

export function identityLabHost(
  ctx: FakeContext,
  runtimeReady: () => Promise<unknown>,
  accountHooks?: IdentityLabAccountHooks & { prepare(): Promise<void> },
) {
  let run = 0;
  let current: IdentityLab | null = null;
  let stopRecovery: (() => void) | null = null;
  const recoverySubscribers = new Set<(value: ReturnType<IdentityLab['subscription']['recovery']>) => void>();
  let starting: Promise<IdentityLab | null> = Promise.resolve(null);
  const settledLab = async () => {
    await runtimeReady();
    for (;;) {
      const pending = starting;
      const lab = await pending;
      if (pending === starting) return lab;
    }
  };
  const start = () => {
    const script = ctx.scenario.identityLab;
    const mine = ++run;
    starting = script
      ? Promise.resolve(accountHooks?.prepare()).then(() => createIdentityLab(ctx, script, accountHooks)).then(async (lab) => {
          if (mine !== run) {
            await lab.dispose().catch(() => undefined);
            return null;
          }
          current = lab;
          stopRecovery = lab.subscription.subscribeRecovery((value) => {
            recoverySubscribers.forEach((callback) => callback(value));
          });
          const recovery = lab.subscription.recovery();
          recoverySubscribers.forEach((callback) => callback(recovery));
          await lab.booted;
          return mine === run ? lab : null;
        })
      : Promise.resolve(null);
  };
  const stop = async () => {
    run += 1;
    const lab = current;
    current = null;
    stopRecovery?.();
    stopRecovery = null;
    starting = Promise.resolve(null);
    await lab?.dispose().catch(() => undefined);
  };
  const route = <T extends object>(fallback: T, pick: (lab: IdentityLab) => T): T =>
    new Proxy(fallback, {
      get(target, key) {
        const value = Reflect.get(target, key);
        if (typeof value !== 'function') return value;
        if (key === 'subscribeRecovery')
          return (callback: (recovery: ReturnType<IdentityLab['subscription']['recovery']>) => void) => {
            recoverySubscribers.add(callback);
            return () => recoverySubscribers.delete(callback);
          };
        if (synchronous.has(key))
          return (...args: unknown[]) => {
            const port = current ? pick(current) : target;
            return (Reflect.get(port, key) as Method).apply(port, args);
          };
        return async (...args: unknown[]) => {
          const lab = await settledLab();
          const port = lab ? pick(lab) : target;
          return (Reflect.get(port, key) as Method).apply(port, args);
        };
      },
    });
  const runDelayedCallbackIsolation = async () => {
    const lab = await settledLab();
    if (!lab) throw new Error('Identity lab is unavailable');
    return lab.runDelayedCallbackIsolation();
  };
  const runDeletionCallbackIsolation = async (seedDeletedAccount: () => Promise<void>) => {
    const lab = await settledLab();
    if (!lab) throw new Error('Identity lab is unavailable');
    return lab.runDeletionCallbackIsolation(seedDeletedAccount);
  };
  return { start, stop, route, runDelayedCallbackIsolation, runDeletionCallbackIsolation };
}
