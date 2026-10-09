import type { ScheduleIssue } from '../schedule/scheduleWindowPlan';
import { planWatchdog, type WatchdogContext, type WatchdogRegistration } from '../ports/watchdog';
import { linkedTrace } from '@linked-trace';

export type EnforcementSnapshot = {
  scheduleIssue?: ScheduleIssue;
  revision: number;
  now: number;
  context: WatchdogContext;
  state: 'shield' | 'open' | 'conditional' | 'unknown';
  relief: 'unlockedWalking' | 'unlockedPropped' | 'unlockedAtGym';
  eligibleUntil: number;
  openReason?: 'earned' | 'outsideWindow' | 'lapsed' | 'disabled' | 'deleting';
  futureEnforcementEligible: boolean;
  windows?: { id: string; start: number; end: number }[];
};
export interface EnforcementTransport {
  publish(snapshot: EnforcementSnapshot): Promise<void>;
  shield(revision: number): Promise<boolean>;
  unshield(revision: number): Promise<boolean>;
  stageWatchdog(plan: WatchdogRegistration, revision: number): Promise<string>;
  commitWatchdog(id: string, revision: number): Promise<boolean>;
  cancelWatchdogs(revision: number): Promise<void>;
  replaceWindows(windows: { id: string; start: number; end: number }[], snapshotRevision: number): Promise<void>;
  policyRevision?(): number;
}
export type EnforcementResult = 'applied' | 'preserved' | 'superseded';

export class EnforcementHost {
  private queue: Promise<unknown> = Promise.resolve();
  private requested = 0;
  private disposed = false;
  private previous: WatchdogRegistration | null = null;
  private watchdogMayBeLive = true;
  private windowsSignature: string | null = null;
  private traceSequence = 0;
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
  dispose(): void { this.disposed = true; this.requested++; }

  private async apply(request: number, force: boolean): Promise<EnforcementResult> {
    const snapshot = this.deps.read();
    const fresh = () => !this.disposed && request === this.requested && this.deps.read().revision === snapshot.revision;
    if (!fresh()) return 'superseded';
    if (snapshot.state === 'unknown') return 'preserved';
    const native = this.deps.transport;
    let policyPublishPending = __LINKED_RECORDER_TRACE__;
    try {
      if (snapshot.state !== 'conditional') await this.stopWatchdogBeforePublishDropsIt(native);
      if (__LINKED_RECORDER_TRACE__) this.tracePolicy(snapshot, 'attempt');
      await native.publish(snapshot);
      policyPublishPending = false;
      if (__LINKED_RECORDER_TRACE__) this.tracePolicy(snapshot, 'returned');
      if (!fresh()) return 'superseded';
      const windows = snapshot.futureEnforcementEligible ? snapshot.windows ?? [] : [];
      const signature = JSON.stringify([snapshot.revision, windows]);
      if (force || signature !== this.windowsSignature) {
        const operationId = __LINKED_RECORDER_TRACE__ ? this.traceId('replace_windows', snapshot.revision) : '';
        if (__LINKED_RECORDER_TRACE__) this.traceWatchdog(operationId, 'replace_windows', 'attempt', snapshot.revision);
        try {
          await native.replaceWindows(windows, snapshot.revision);
          if (__LINKED_RECORDER_TRACE__) this.traceWatchdog(operationId, 'replace_windows', 'returned', snapshot.revision);
        } catch (error) {
          if (__LINKED_RECORDER_TRACE__) this.traceWatchdog(operationId, 'replace_windows', 'failed', snapshot.revision);
          throw error;
        }
        if (!fresh()) return 'superseded';
        this.windowsSignature = signature;
      }
      if (snapshot.state === 'open') {
        if (!await this.traceShield(native, 'unshield', 'policy_open', snapshot.revision)) throw new Error('Native open policy was not applied');
        if (!fresh()) return 'superseded';
        await this.cancelWatchdogs(native, snapshot.revision);
        this.previous = null;
      } else if (snapshot.state === 'shield') {
        if (!await this.traceShield(native, 'shield', 'policy_shield', snapshot.revision)) throw new Error('Native shield policy was not applied');
        if (!fresh()) return 'superseded';
        await this.cancelWatchdogs(native, snapshot.revision);
        this.previous = null;
      } else {
        this.watchdogMayBeLive = true;
        const plan = planWatchdog({
          now: snapshot.now, decision: snapshot.relief, entitlement: 'active', canEnforce: true,
          deleting: false, context: snapshot.context, eligibleUntil: snapshot.eligibleUntil,
          previous: this.previous, force,
        });
        if (plan.cancel) throw new Error('Conditional relief has no eligible watchdog window');
        if (plan.register) {
          const stageId = __LINKED_RECORDER_TRACE__ ? this.traceId('stage', snapshot.revision) : '';
          if (__LINKED_RECORDER_TRACE__) this.traceWatchdog(stageId, 'stage', 'attempt', snapshot.revision, plan.register);
          let id: string;
          try {
            id = await native.stageWatchdog(plan.register, snapshot.revision);
            if (__LINKED_RECORDER_TRACE__) this.traceWatchdog(stageId, 'stage', 'returned', snapshot.revision, plan.register);
          } catch (error) {
            if (__LINKED_RECORDER_TRACE__) this.traceWatchdog(stageId, 'stage', 'failed', snapshot.revision, plan.register);
            throw error;
          }
          if (!fresh()) return 'superseded';
          const commitId = __LINKED_RECORDER_TRACE__ ? this.traceId('commit', snapshot.revision) : '';
          if (__LINKED_RECORDER_TRACE__) this.traceWatchdog(commitId, 'commit', 'attempt', snapshot.revision);
          let committed: boolean;
          try {
            committed = await native.commitWatchdog(id, snapshot.revision);
            if (__LINKED_RECORDER_TRACE__) this.traceWatchdog(commitId, 'commit', committed ? 'returned' : 'rejected', snapshot.revision);
          } catch (error) {
            if (__LINKED_RECORDER_TRACE__) this.traceWatchdog(commitId, 'commit', 'failed', snapshot.revision);
            throw error;
          }
          if (!committed) throw new Error('Watchdog commit rejected');
          if (!fresh()) return 'superseded';
          this.previous = plan.register;
        }
        if (!this.previous || this.previous.end <= this.deps.read().now) throw new Error('No live watchdog protection');
        if (!fresh()) return 'superseded';
        if (!await this.traceShield(native, 'unshield', 'conditional_relief', snapshot.revision)) throw new Error('Native relief policy was not applied');
      }
      return fresh() ? 'applied' : 'superseded';
    } catch (error) {
      if (__LINKED_RECORDER_TRACE__ && policyPublishPending) this.tracePolicy(snapshot, 'failed');
      if (fresh() && (snapshot.state === 'conditional' || snapshot.state === 'shield')) {
        try {
          if (!await this.traceShield(native, 'shield', 'fail_closed', snapshot.revision)) throw new Error('Fail-closed shield rejected');
        } catch (shieldError) { this.deps.report(shieldError); }
      }
      this.deps.report(error);
      throw error;
    }
  }

  private async stopWatchdogBeforePublishDropsIt(native: EnforcementTransport): Promise<void> {
    if (!this.watchdogMayBeLive) return;
    this.previous = null;
    this.watchdogMayBeLive = false;
    try {
      const revision = native.policyRevision?.() ?? -1;
      if (revision >= 0) await native.cancelWatchdogs(revision);
    } catch {
      return;
    }
  }

  private traceId(operation: string, revision: number): string {
    this.traceSequence += 1;
    return `${revision}:${operation}:${this.traceSequence}`;
  }

  private tracePolicy(snapshot: EnforcementSnapshot, status: string): void {
    if (!__LINKED_RECORDER_TRACE__) return;
    linkedTrace.record('policy_publish', {
      layer: 'js',
      status,
      revision: snapshot.revision,
      state: snapshot.state,
      relief: snapshot.relief,
      eligibleUntilWallMs: snapshot.eligibleUntil,
      openReason: snapshot.openReason,
      futureEnforcementEligible: snapshot.futureEnforcementEligible,
      policyGeneration: snapshot.context.policyGeneration,
      accountGeneration: snapshot.context.accountGeneration,
    });
  }

  private traceWatchdog(
    operationId: string,
    operation: string,
    status: string,
    revision: number,
    registration?: WatchdogRegistration,
  ): void {
    if (!__LINKED_RECORDER_TRACE__) return;
    linkedTrace.record('watchdog_operation', {
      operation,
      status,
      revision,
      startWallMs: registration?.start,
      endWallMs: registration?.end,
      registeredAtWallMs: registration?.registeredAt,
      eligibleUntilWallMs: registration?.eligibleUntil,
    }, operationId);
  }

  private async cancelWatchdogs(native: EnforcementTransport, revision: number): Promise<void> {
    if (!__LINKED_RECORDER_TRACE__) {
      await native.cancelWatchdogs(revision);
      return;
    }
    const operationId = this.traceId('cancel', revision);
    this.traceWatchdog(operationId, 'cancel', 'attempt', revision);
    try {
      await native.cancelWatchdogs(revision);
      this.traceWatchdog(operationId, 'cancel', 'returned', revision);
    } catch (error) {
      this.traceWatchdog(operationId, 'cancel', 'failed', revision);
      throw error;
    }
  }

  private async traceShield(
    native: EnforcementTransport,
    operation: 'shield' | 'unshield',
    initiator: string,
    revision: number,
  ): Promise<boolean> {
    const desired = operation === 'shield';
    if (!__LINKED_RECORDER_TRACE__) return desired ? native.shield(revision) : native.unshield(revision);
    const operationId = this.traceId(operation, revision);
    linkedTrace.record('shield_write', { operation, status: 'attempt', desired, initiator, revision }, operationId);
    try {
      const returned = desired ? await native.shield(revision) : await native.unshield(revision);
      linkedTrace.record('shield_write', {
        operation,
        status: returned ? 'returned' : 'rejected',
        desired,
        initiator,
        revision,
      }, operationId);
      return returned;
    } catch (error) {
      linkedTrace.record('shield_write', {
        operation,
        status: 'failed',
        desired,
        initiator,
        revision,
        reason: 'native_error',
      }, operationId);
      throw error;
    }
  }
}
