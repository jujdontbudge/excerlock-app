import type { AuthIdentity } from '../../ports/AuthPort';
import type { Unsubscribe } from '../../ports/models';
import type { RunIdentityOperation } from './identityBarrier';

/**
 * Canonical identity spine coordinator.
 *
 * Order (awaited, asserted in tests):
 *   canonical Supabase identity
 *   -> authenticated PUT /v1/user (Bearer from SecureStore session)
 *   -> awaited analytics identify (PostHog distinct_id = Supabase UID)
 *   -> awaited subscription identify (Adapty activate then identify)
 *   -> integration attachment (Adapty setIntegrationIdentifier posthog_distinct_id)
 *   -> ready
 *
 * Provisional UI is usable immediately; purchases/restores and person-bound
 * exposures must await the SAME exported ready gate (T05 uses
 * waitForIdentityReady). Fresh unchanged identity never re-runs the spine.
 * No automatic PostHog alias. No client-only subscription transfer.
 */

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
      // Defer outside any Supabase SDK lock / subscriber lock.
      setTimeout(() => {
        if (this.disposed) return;
        void this.onIdentity(identity).catch(() => undefined);
      }, 0);
    });
    // Process current identity (deferred as well for consistent ordering).
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
    for (const entries of this.readyResolvers.values()) {
      for (const entry of entries) entry.reject(error);
    }
    this.readyResolvers.clear();
    this.readyByKey.clear();
  }

  private revokeReadiness(identity: AuthIdentity): void {
    const key = identity.userId ? `${identity.generation}:${identity.userId}` : null;
    for (const [readyKey] of this.readyByKey) {
      if (!key || readyKey !== key || identity.kind !== 'canonical' || !identity.ready) {
        this.readyByKey.delete(readyKey);
      }
    }
  }

  private keyFor(identity: AuthIdentity): string | null {
    if (identity.kind !== 'canonical' || !identity.userId) return null;
    return `${identity.generation}:${identity.userId}`;
  }

  /** True when the spine has completed for the current canonical identity. */
  isReady(): boolean {
    const identity = this.deps.getIdentity();
    const key = this.keyFor(identity);
    return key !== null && this.readyByKey.has(key);
  }

  /**
   * SAME gate T05 must await before every purchase/restore. Resolves when the
   * spine completes for the current generation; rejects on tombstone or when
   * generation changes. Never resolves while provisional or deleting.
   */
  async waitForIdentityReady(options?: { timeoutMs?: number }): Promise<AuthIdentity> {
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
        // If generation changed, the wait is stale.
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
      // Also resolve via explicit ready notification below.
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
      // Immediate check in case ready already arrived between start and subscribe.
      if (startKey && this.readyByKey.has(startKey)) {
        cleanup();
        const ready = this.readyByKey.get(startKey);
        if (ready) resolve({ ...ready, ready: true });
      }
    });
  }

  /** Manual retry entry for visible retry buttons after PUT/identify failures. */
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
    // 1. Authenticated PUT /v1/user with current Bearer. No userId from body.
    const authContext = await this.deps.getAuthContext();
    if (this.disposed || this.keyFor(this.deps.getIdentity()) !== key) return;
    if (!authContext || authContext.userId !== userId || authContext.generation !== identity.generation) {
      // No token yet (secure hydration race); remain unready, retryable.
      return;
    }
    let put: PutUserResult;
    try {
      put = await this.deps.putUser({ accessToken: authContext.accessToken, userId });
    } catch {
      // Network/transient: remain unready, visible retry. Do not mark ready.
      return;
    }
    if (this.disposed || this.keyFor(this.deps.getIdentity()) !== key) return;
    if (put.status === 410) {
      // Tombstoned: invalidate local auth, boot fresh anonymous. Never ready.
      try {
        await this.deps.onTombstone?.(userId);
      } catch {
        // Tombstone handler surfaces its own retry; coordinator stays unready.
      }
      this.notifyRejected(key, new Error('Account deleted (410); local session invalidated'));
      return;
    }
    if (put.status < 200 || put.status >= 300) {
      // Includes 502/503: not success, remain unready, visible retry.
      return;
    }
    if (this.disposed || this.keyFor(this.deps.getIdentity()) !== key) return;
    // 2. Awaited analytics identify. 3. Awaited subscription identify.
    // Order is asserted; ready stays false through each await.
    try {
      await this.deps.analyticsIdentify(userId);
    } catch {
      return;
    }
    // If generation changed mid-spine, abandon without marking ready.
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
    // No alias, no client transfer. Mark ready for this exact key only.
    this.lastReadyKey = key;
    const readyIdentity: AuthIdentity = { ...identity, ready: true };
    if (this.disposed) return;
    this.readyByKey.set(key, readyIdentity);
    try {
      this.deps.onReady?.(readyIdentity);
    } catch { /* ignore */ }
    this.notifyResolved(key, readyIdentity);
  }

  private notifyResolved(key: string, identity: AuthIdentity): void {
    if (this.disposed) return;
    const list = this.readyResolvers.get(key) ?? [];
    // Also notify generation-scoped waiters.
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
