import {
  NavigatorLockAcquireTimeoutError,
  processLock,
  type LockFunc,
} from '@supabase/auth-js';

const closedError = () => new NavigatorLockAcquireTimeoutError('Auth lifecycle is closing');

export class AuthSdkLifecycle {
  private callsAccepting = true;
  private locksAccepting = true;
  private calls = new Set<Promise<unknown>>();
  private locks = new Set<Promise<unknown>>();
  private lateLockAdmissions = 0;

  readonly lock: LockFunc = <R>(name: string, timeout: number, operation: () => Promise<R>) => {
    if (!this.locksAccepting) {
      this.lateLockAdmissions += 1;
      return Promise.reject(closedError());
    }
    const result = processLock(name, timeout, operation);
    this.track(this.locks, result);
    return result;
  };

  run<R>(operation: () => Promise<R>): Promise<R> {
    if (!this.callsAccepting) return Promise.reject(new Error('Auth SDK lifecycle is closing'));
    const result = Promise.resolve().then(operation);
    this.track(this.calls, result);
    return result;
  }

  closeCalls(): void { this.callsAccepting = false; }
  closeLocks(): void { this.locksAccepting = false; }
  async drainCalls(): Promise<void> { await this.drain(this.calls); }
  async drainLocks(): Promise<void> {
    await this.drain(this.locks);
    if (this.lateLockAdmissions) throw new Error(`Auth SDK attempted ${this.lateLockAdmissions} lock acquisition(s) after closure`);
  }

  private track<R>(set: Set<Promise<unknown>>, promise: Promise<R>): void {
    set.add(promise);
    void promise.finally(() => set.delete(promise)).catch(() => undefined);
  }

  private async drain(set: Set<Promise<unknown>>): Promise<void> {
    // Rejection is an operation outcome, not evidence of incomplete cleanup.
    // Quiescence requires waiting for settlement, regardless of that outcome.
    await Promise.allSettled([...set]);
  }
}
