import type { AuthIdentity } from '../../ports/AuthPort';
import type { Unsubscribe } from '../../model/models';
import type { RunIdentityOperation } from '../identityBarrier';


export type PutUserResult = { status: number };
export type AuthContext = { accessToken: string; userId: string; generation: number };
export type IdentityCoordinatorDeps = {
  getIdentity: () => AuthIdentity;
  subscribeIdentity: (callback: (identity: AuthIdentity) => void) => Unsubscribe;
  getAuthContext: () => Promise<AuthContext | null>;
  putUser: (args: { accessToken: string; userId: string }) => Promise<PutUserResult>;
  analyticsIdentify: (userId: string) => Promise<void>;
  subscriptionIdentify: (userId: string) => Promise<void>;
  attachIntegration: (userId: string) => Promise<void>;
  prepareAccount?: (identity: AuthIdentity) => Promise<void>;
  onTombstone?: (userId: string) => Promise<void>;
  onReady?: (identity: AuthIdentity) => void;
  runIdentityOperation?: RunIdentityOperation;
};

export class IdentityCoordinator {
  private deps: IdentityCoordinatorDeps;
  private unsubscribe: Unsubscribe | null = null;
  private lastReadyKey: string | null = null;
  private readyResolvers = new Map<string, { resolve: (v: AuthIdentity) => void; reject: (e: unknown) => void }[]>();
  private readyByKey = new Map<string, AuthIdentity>();
  private inFlight = new Map<string, Promise<void>>();
  private runIdentityOperation: RunIdentityOperation;
  private disposed = false;

  constructor(deps: IdentityCoordinatorDeps) {
    this.deps = deps;
    this.runIdentityOperation = deps.runIdentityOperation ?? (async (operation) => operation());
  }

  start(): void {
    if (this.unsubscribe) return;
    this.unsubscribe = this.deps.subscribeIdentity((identity) => {
      this.revokeReadiness(identity);
      setTimeout(() => {
        if (this.disposed) return;
        void this.onIdentity(identity).catch(() => undefined);
      }, 0);
    });
    const current = this.deps.getIdentity();
    setTimeout(() => {
      if (this.disposed) return;
      void this.onIdentity(current).catch(() => undefined);
    }, 0);
  }

  dispose(): void {
    this.disposed = true;
    this.unsubscribe?.();
    this.unsubscribe = null;
    const error = new Error('Identity coordinator disposed');
    const waiters = [...this.readyResolvers.values()].flatMap((entries) => [...entries]);
    this.readyResolvers.clear();
    this.readyByKey.clear();
    for (const entry of waiters) entry.reject(error);
  }

  private revokeReadiness(identity: AuthIdentity): void {
    const key = identity.userId ? `${identity.generation}:${identity.userId}` : null;
    for (const [readyKey] of this.readyByKey) {
      if (!key || readyKey !== key || identity.kind !== 'canonical' || !identity.ready) {
        this.readyByKey.delete(readyKey);
      }
    }
    if (!key || identity.kind !== 'canonical' || !identity.ready || this.lastReadyKey !== key) {
      this.lastReadyKey = null;
    }
  }

  private keyFor(identity: AuthIdentity): string | null {
    if (identity.kind !== 'canonical' || !identity.userId) return null;
    return `${identity.generation}:${identity.userId}`;
  }

  isReady(): boolean {
    const identity = this.deps.getIdentity();
    const key = this.keyFor(identity);
    return key !== null && this.readyByKey.has(key);
  }

  async waitForIdentityReady(options?: { timeoutMs?: number }): Promise<AuthIdentity> {
    if (this.disposed) throw new Error('Identity coordinator disposed');
    const timeoutMs = options?.timeoutMs ?? 15000;
    const start = this.deps.getIdentity();
    const startKey = this.keyFor(start);
    if (startKey && this.readyByKey.has(startKey)) {
      const ready = this.readyByKey.get(startKey);
      if (ready) return { ...ready, ready: true };
    }
    if (start.kind === 'deleting') {
      throw new Error('Identity is deleting; purchases are disabled until a fresh identity is ready');
    }
    return new Promise<AuthIdentity>((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(`Identity not ready within ${timeoutMs}ms`));
      }, timeoutMs);
      const checkGeneration = () => {
        const now = this.deps.getIdentity();
        if (now.generation !== start.generation) {
          cleanup();
          reject(new Error('Identity generation changed while waiting for ready'));
          return true;
        }
        return false;
      };
      const onIdentity = (identity: AuthIdentity) => {
        if (checkGeneration()) return;
        if (identity.kind === 'deleting') {
          cleanup();
          reject(new Error('Identity is deleting; purchases are disabled'));
          return;
        }
        const key = this.keyFor(identity);
        if (key && this.readyByKey.has(key)) {
          cleanup();
          const ready = this.readyByKey.get(key);
          if (ready) resolve({ ...ready, ready: true });
        }
      };
      const unsub = this.deps.subscribeIdentity(onIdentity);
      const key = startKey ?? `gen:${start.generation}`;
      const list = this.readyResolvers.get(key) ?? [];
      const entry = {
        resolve: (v: AuthIdentity) => {
          cleanup();
          resolve(v);
        },
        reject: (e: unknown) => {
          cleanup();
          reject(e instanceof Error ? e : new Error(String(e)));
        },
      };
      list.push(entry);
      this.readyResolvers.set(key, list);
      const cleanup = () => {
        clearTimeout(timer);
        unsub();
        const current = this.readyResolvers.get(key);
        if (current) {
          const idx = current.indexOf(entry);
          if (idx >= 0) current.splice(idx, 1);
        }
      };
      if (startKey && this.readyByKey.has(startKey)) {
        cleanup();
        const ready = this.readyByKey.get(startKey);
        if (ready) resolve({ ...ready, ready: true });
      }
    });
  }

  async retry(): Promise<void> {
    const identity = this.deps.getIdentity();
    await this.onIdentity(identity, { force: true });
  }

  private async onIdentity(identity: AuthIdentity, options?: { force?: boolean }): Promise<void> {
    if (this.disposed) return;
    const key = this.keyFor(identity);
    if (!key || !identity.userId) return;
    if (!options?.force && this.readyByKey.has(key)) return;
    if (!options?.force && this.lastReadyKey === key) return;
    const inFlight = this.inFlight.get(key);
    if (inFlight) {
      await inFlight;
      return;
    }
    const run = this.runIdentityOperation(() => this.runSpine(identity, key));
    this.inFlight.set(key, run);
    try {
      await run;
    } finally {
      if (this.inFlight.get(key) === run) this.inFlight.delete(key);
    }
  }

  private async runSpine(identity: AuthIdentity, key: string): Promise<void> {
    const userId = identity.userId;
    if (!userId) return;
    if (this.disposed || this.keyFor(this.deps.getIdentity()) !== key) return;
    const authContext = await this.deps.getAuthContext();
    if (this.disposed || this.keyFor(this.deps.getIdentity()) !== key) return;
    if (!authContext || authContext.userId !== userId || authContext.generation !== identity.generation) {
      return;
    }
    let put: PutUserResult;
    try {
      put = await this.deps.putUser({ accessToken: authContext.accessToken, userId });
    } catch {
      return;
    }
    if (this.disposed || this.keyFor(this.deps.getIdentity()) !== key) return;
    if (put.status === 410) {
      try {
        await this.deps.onTombstone?.(userId);
      } catch {
      }
      this.notifyRejected(key, new Error('Account deleted (410); local session invalidated'));
      return;
    }
    if (put.status < 200 || put.status >= 300) {
      return;
    }
    if (this.disposed || this.keyFor(this.deps.getIdentity()) !== key) return;
    try {
      await this.deps.analyticsIdentify(userId);
    } catch {
      return;
    }
    if (this.disposed || this.keyFor(this.deps.getIdentity()) !== key) return;
    try {
      await this.deps.subscriptionIdentify(userId);
    } catch {
      return;
    }
    if (this.disposed || this.keyFor(this.deps.getIdentity()) !== key) return;
    try {
      await this.deps.attachIntegration(userId);
    } catch {
      return;
    }
    if (this.disposed || this.keyFor(this.deps.getIdentity()) !== key) return;
    try {
      await this.deps.prepareAccount?.(identity);
    } catch {
      return;
    }
    if (this.disposed || this.keyFor(this.deps.getIdentity()) !== key) return;
    this.lastReadyKey = key;
    const readyIdentity: AuthIdentity = { ...identity, ready: true };
    if (this.disposed) return;
    this.readyByKey.set(key, readyIdentity);
    try {
      this.deps.onReady?.(readyIdentity);
    } catch {}
    this.notifyResolved(key, readyIdentity);
  }

  private notifyResolved(key: string, identity: AuthIdentity): void {
    if (this.disposed) return;
    const list = this.readyResolvers.get(key) ?? [];
    const genKey = `gen:${identity.generation}`;
    const genList = this.readyResolvers.get(genKey) ?? [];
    const all = [...list, ...genList];
    this.readyResolvers.delete(key);
    this.readyResolvers.delete(genKey);
    for (const entry of all) entry.resolve(identity);
  }

  private notifyRejected(key: string, error: unknown): void {
    const list = this.readyResolvers.get(key) ?? [];
    const generation = key.split(':', 1)[0];
    const genKey = `gen:${generation}`;
    const genList = this.readyResolvers.get(genKey) ?? [];
    this.readyResolvers.delete(key);
    this.readyResolvers.delete(genKey);
    for (const entry of [...list, ...genList]) entry.reject(error);
  }
}

export function createIdentityCoordinator(deps: IdentityCoordinatorDeps): IdentityCoordinator {
  return new IdentityCoordinator(deps);
}
