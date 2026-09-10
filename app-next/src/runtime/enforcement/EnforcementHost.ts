import { planWatchdog, type WatchdogContext, type WatchdogRegistration } from '../../domain/watchdog';

export type EnforcementSnapshot = {
  /** Monotonically increasing revision, including account/selection/eligibility changes. */
  revision: number;
  now: number;
  context: WatchdogContext;
  state: 'shield' | 'open' | 'conditional' | 'unknown';
  relief: 'unlockedWalking' | 'unlockedPropped' | 'unlockedAtGym';
  eligibleUntil: number;
  openReason?: 'earned' | 'outsideWindow' | 'lapsed' | 'disabled' | 'deleting';
  futureEnforcementEligible: boolean;
  /** Exact union windows, supplied by root schedule planner; never broaden gaps. */
  windows?: { id: string; start: number; end: number }[];
};
export interface EnforcementTransport {
  /** Atomically publishes eligibility/suppression before callbacks can write shields. */
  publish(snapshot: EnforcementSnapshot): Promise<void>;
  /** Every native operation MUST compare the revision under the same native lock. */
  shield(revision: number): Promise<boolean>;
  unshield(revision: number): Promise<boolean>;
  /** Stage a new monitor WITHOUT removing the currently valid one. */
  stageWatchdog(plan: WatchdogRegistration, revision: number): Promise<string>;
  /** Commit staged protection and retire old registration without a protection gap. */
  commitWatchdog(id: string, revision: number): Promise<boolean>;
  cancelWatchdogs(revision: number): Promise<void>;
  /** Atomically replace the guarded DeviceActivity schedule (at most seven union windows). */
  replaceWindows(windows: { id: string; start: number; end: number }[], snapshotRevision: number): Promise<void>;
}
export type EnforcementResult = 'applied' | 'preserved' | 'superseded';

/** One host for root subscriptions, foreground and headless wakes, never per-tab. */
export class EnforcementHost {
  private queue: Promise<unknown> = Promise.resolve();
  private requested = 0;
  private disposed = false;
  private previous: WatchdogRegistration | null = null;
  private windowsSignature: string | null = null;
  constructor(private deps: {
    read(): EnforcementSnapshot;
    transport: EnforcementTransport;
    report(error: unknown): void;
  }) {}

  reconcile(force = false): Promise<EnforcementResult> {
    if (this.disposed) return Promise.reject(new Error('Enforcement host disposed'));
    const request = ++this.requested;
    const work = this.queue.then(() => this.apply(request, force));
    this.queue = work.catch(() => undefined);
    return work;
  }
  /** Stops JS ownership only; bounded native protection survives JS disposal. */
  dispose(): void { this.disposed = true; this.requested++; }

  private async apply(request: number, force: boolean): Promise<EnforcementResult> {
    const snapshot = this.deps.read();
    const fresh = () => !this.disposed && request === this.requested && this.deps.read().revision === snapshot.revision;
    if (!fresh()) return 'superseded';
    // Unknown entitlement cannot create new relief or renew old protection.
    if (snapshot.state === 'unknown') return 'preserved';
    const native = this.deps.transport;
    try {
      await native.publish(snapshot);
      if (!fresh()) return 'superseded';
      const windows = snapshot.futureEnforcementEligible ? snapshot.windows ?? [] : [];
      const signature = JSON.stringify([snapshot.revision, windows]);
      if (force || signature !== this.windowsSignature) {
        await native.replaceWindows(windows, snapshot.revision);
        if (!fresh()) return 'superseded';
        this.windowsSignature = signature;
      }
      if (snapshot.state === 'open') {
        // Native snapshot has already invalidated queued callback authority.
        if (!await native.unshield(snapshot.revision)) throw new Error('Native open policy was not applied');
        if (!fresh()) return 'superseded';
        await native.cancelWatchdogs(snapshot.revision);
        this.previous = null;
      } else if (snapshot.state === 'shield') {
        if (!await native.shield(snapshot.revision)) throw new Error('Native shield policy was not applied');
        if (!fresh()) return 'superseded';
        await native.cancelWatchdogs(snapshot.revision);
        this.previous = null;
      } else {
        const plan = planWatchdog({
          now: snapshot.now, decision: snapshot.relief, entitlement: 'active', canEnforce: true,
          deleting: false, context: snapshot.context, eligibleUntil: snapshot.eligibleUntil,
          previous: this.previous, force,
        });
        if (plan.cancel) throw new Error('Conditional relief has no eligible watchdog window');
        if (plan.register) {
          const id = await native.stageWatchdog(plan.register, snapshot.revision);
          if (!fresh()) return 'superseded';
          if (!await native.commitWatchdog(id, snapshot.revision)) throw new Error('Watchdog commit rejected');
          if (!fresh()) return 'superseded';
          this.previous = plan.register;
        }
        if (!this.previous || this.previous.end <= this.deps.read().now) throw new Error('No live watchdog protection');
        if (!fresh()) return 'superseded';
        if (!await native.unshield(snapshot.revision)) throw new Error('Native relief policy was not applied');
      }
      return fresh() ? 'applied' : 'superseded';
    } catch (error) {
      // Never manufacture shields after earned unlock/lapse/window end/deletion.
      // Native revision check closes the race after this final JS freshness read.
      if (fresh() && (snapshot.state === 'conditional' || snapshot.state === 'shield')) {
        try {
          if (!await native.shield(snapshot.revision)) throw new Error('Fail-closed shield rejected');
        } catch (shieldError) { this.deps.report(shieldError); }
      }
      this.deps.report(error);
      throw error;
    }
  }
}
