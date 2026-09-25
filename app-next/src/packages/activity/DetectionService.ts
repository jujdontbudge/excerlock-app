import { detectionStore, persistDetectionState } from './detectionStore';
import { createWalkingState, reduceWalking } from './walkingMachine';
import { reducePropped } from './proppedMachine';
import type { ProppedEvent, ProppedState } from './proppedMachine';
import { reduceGym, pruneGymHistoryBefore } from './gymMachine';
import type { GymVisitLog } from './lib/location/GymVisitLog';
import type { MotionAdapter, MotionEvidence } from './lib/detection/MotionAdapter';
import type { PlacementAdapter } from './lib/detection/PlacementAdapter';
import type { HistoryCredit, HistoryCreditLedger, HistoryLedger, InstanceStepMeasurement } from './lib/detection/HistoryCreditLedger';
import { addDays, dayKey, localDayStart } from '../schedule/calendar';
import type { DetectionData, PendingHistoryCredit } from './detectionStore';
import type { WalkingDurationLedger } from './WalkingDurationLedger';
import { runCleanups } from './lib/detection/runCleanups';
import { linkedTrace } from '@linked-trace';
export type { HistoryCredit };
export const MAX_HISTORY_SEGMENTS_PER_WAKE = 8;
export type DetectionWake = {
  now: number;
  dayStart: number;
  walkingGraceMs: number;
  generation: number;
  timezone: string;
  source: 'foreground' | 'background' | 'geofence' | 'manual';
  includeStepHistory?: boolean;
};
export class DetectionService {
  private disposers: (() => void)[] = [];
  private queue: Promise<void> = Promise.resolve();
  private lifecycle: Promise<void> = Promise.resolve();
  private lastWork: Promise<unknown> = Promise.resolve();
  private committedListeners = new Set<() => void>();
  private lastDurableTraceData: DetectionData | null = null;
  constructor(
    private readonly deps: {
      motion: MotionAdapter;
      placement: PlacementAdapter;
      gymLog: GymVisitLog;
      historyLedger: Pick<HistoryCreditLedger, 'read' | 'apply'> &
        Partial<Pick<HistoryCreditLedger, 'readInstanceMeasurement' | 'recordInstanceMeasurement'>>;
      walkingDurationLedger?: Pick<WalkingDurationLedger, 'observe'>;
      walkingTimezone?: () => string;
      persist?: () => Promise<void>;
      onError?: (error: unknown) => void;
    },
  ) {}
  start(walkingGraceMs: number): Promise<void> {
    return this.runLifecycle(async () => {
      if (this.disposers.length) return;
      const generation = detectionStore.getState().data.generation;
      if (__LINKED_RECORDER_TRACE__) this.lastDurableTraceData = detectionStore.getState().data;
      this.disposers = [
        this.deps.motion.subscribe((evidence) => {
          void this.enqueue(() => this.applyMotion(evidence, walkingGraceMs, generation)).catch((error) =>
            this.deps.onError?.(error),
          );
        }),
        this.deps.placement.subscribe((result) => {
          if (!result.transition) return;
          void this.enqueue(async () => {
            this.assertGeneration(generation);
            const data = detectionStore.getState().data;
            const kind = result.transition!.kind === 'pickedUp' ? 'pickup' : 'putDown';
            const at = result.transition!.timestampMs;
            detectionStore.getState().patch({
              propped: reducePropped(
                data.propped,
                { kind, at },
                at,
              ),
              ...(kind === 'putDown' ? { walking: createWalkingState(at) } : {}),
              observedAt: at,
            });
            await this.commitObserved(at, generation, undefined, 'placement');
          }).catch((error) => this.deps.onError?.(error));
        }),
      ];
      try {
        await this.deps.motion.start();
        this.assertGeneration(generation);
        await this.deps.placement.start();
        this.assertGeneration(generation);
      } catch (error) {
        this.disposers.splice(0).forEach((dispose) => dispose());
        await Promise.allSettled([this.deps.motion.stop(), this.deps.placement.stop()]);
        throw error;
      }
    });
  }
  stop(): Promise<void> {
    return this.runLifecycle(async () => {
      const disposers = this.disposers.splice(0);
      await runCleanups(
        [
          ...disposers.map((dispose) => () => dispose()),
          () => this.deps.motion.stop(),
          () => this.deps.placement.stop(),
          () => this.queue,
        ],
        'Detection service cleanup failed',
      );
    });
  }
  reconcileWake(wake: DetectionWake): Promise<void> {
    return this.enqueue(async () => {
      this.assertGeneration(wake.generation);
      const before = detectionStore.getState().data;
      const motion = this.deps.motion.reconcile(wake.now);
      const placement = this.deps.placement.reconcile(wake.now);
      const records = await this.deps.gymLog.readAll();
      this.assertGeneration(wake.generation);
      let walking = reduceWalking(
        before.walking,
        { kind: 'evidence', at: motion.observedAt, qualifying: motion.qualifying, verifiedMs: motion.verifiedMs, stopped: motion.stopped },
        wake.now,
        wake.walkingGraceMs,
      );
      walking = reduceWalking(walking, { kind: 'tick' }, wake.now, wake.walkingGraceMs);
      let propped = reducePropped(before.propped, { kind: 'tick' }, wake.now);
      if (placement.placement === 'unknown' && before.propped.phase !== 'inactive')
        propped = reducePropped(propped, { kind: 'coverageLost', at: wake.now }, wake.now);
      const gym = reduceGym(before.gym, { kind: 'records', records }, wake.now);
      if (wake.includeStepHistory === false) {
        detectionStore.getState().patch({ walking, propped, gym, observedAt: wake.now });
        await this.commitObserved(wake.now, wake.generation, wake.timezone, 'wake');
        return;
      }
      let ledger = await this.deps.historyLedger.read();
      this.assertGeneration(wake.generation);
      if (before.pendingHistory) {
        ledger = await this.commitHistory(before.pendingHistory, wake, ledger);
      }
      const knownCursors = [before.creditedThrough.steps, ledger.through].filter(
        (value): value is number => value !== undefined && value !== null,
      );
      let cursor = knownCursors.length ? Math.max(...knownCursors) : wake.dayStart;
      let segments = 0;
      while (cursor < wake.now && segments < MAX_HISTORY_SEGMENTS_PER_WAKE) {
        const to = Math.min(wake.now, nextLocalMidnight(cursor, wake.timezone));
        const { steps } = await this.deps.motion.querySteps(cursor, to);
        this.assertGeneration(wake.generation);
        const pending = {
          idempotencyKey: `steps:${wake.generation}:${cursor}:${to}`,
          from: cursor,
          to,
          steps,
          timezone: wake.timezone,
        };
        detectionStore.getState().patch({ pendingHistory: pending });
        await this.persist();
        this.assertGeneration(wake.generation);
        ledger = await this.commitHistory(pending, wake, ledger);
        cursor = Math.max(to, ledger.through ?? to);
        segments += 1;
      }
      detectionStore.getState().patch({
        walking,
        propped,
        gym,
        observedAt: wake.now,
        creditedThrough: { ...before.creditedThrough, steps: cursor },
        pendingHistory: null,
      });
      await this.commitObserved(wake.now, wake.generation, wake.timezone, 'wake');
    });
  }
  measureStepRanges(
    ranges: readonly { key: string; from: number; to: number; timezone: string }[],
    generation: number,
  ): Promise<Readonly<Record<string, InstanceStepMeasurement>>> {
    return this.enqueue(async () => {
      this.assertGeneration(generation);
      const read = this.deps.historyLedger.readInstanceMeasurement;
      const record = this.deps.historyLedger.recordInstanceMeasurement;
      if (!read || !record) throw new Error('Instance step measurement storage is unavailable');
      const result: Record<string, InstanceStepMeasurement> = {};
      for (const range of ranges) {
        if (!range.key || !Number.isFinite(range.from) || !Number.isFinite(range.to) || range.to <= range.from ||
          !range.timezone) throw new Error('Invalid instance step measurement range');
        dayKey(new Date(range.from).toISOString(), range.timezone);
        this.assertGeneration(generation);
        const cached = await read.call(this.deps.historyLedger, range.key);
        this.assertGeneration(generation);
        if (cached && cached.from === range.from && cached.through === range.to && cached.timezone === range.timezone) {
          result[range.key] = cached;
          continue;
        }
        const { steps } = await this.deps.motion.querySteps(range.from, range.to);
        this.assertGeneration(generation);
        const sample = { from: range.from, through: range.to, steps, timezone: range.timezone };
        result[range.key] = await record.call(this.deps.historyLedger, range.key, sample);
        this.assertGeneration(generation);
      }
      return result;
    });
  }
  tick(now: number, walkingGraceMs: number, generation: number): Promise<void> {
    return this.enqueue(async () => {
      this.assertGeneration(generation);
      const before = detectionStore.getState().data;
      const motion = this.deps.motion.reconcile(now);
      const placement = this.deps.placement.reconcile(now);
      const records = await this.deps.gymLog.readAll();
      this.assertGeneration(generation);
      let walking = reduceWalking(
        before.walking,
        { kind: 'evidence', at: motion.observedAt, qualifying: motion.qualifying, verifiedMs: motion.verifiedMs, stopped: motion.stopped },
        now,
        walkingGraceMs,
      );
      walking = reduceWalking(walking, { kind: 'tick' }, now, walkingGraceMs);
      let propped = reducePropped(before.propped, { kind: 'tick' }, now);
      if (placement.placement === 'unknown' && before.propped.phase !== 'inactive')
        propped = reducePropped(propped, { kind: 'coverageLost', at: now }, now);
      const gym = reduceGym(before.gym, { kind: 'records', records }, now);
      detectionStore.getState().patch({ walking, propped, gym, observedAt: now });
      await this.commitObserved(now, generation, undefined, 'tick');
    });
  }
  pruneGymHistory(cutoffMs: number, generation: number): Promise<void> {
    return this.enqueue(async () => {
      this.assertGeneration(generation);
      const before = detectionStore.getState().data;
      const gym = pruneGymHistoryBefore(before.gym, cutoffMs);
      detectionStore.getState().patch({ gym });
      await this.persist();
      this.assertGeneration(generation);
    });
  }
  observeCommitted(callback: () => void): () => void {
    this.committedListeners.add(callback);
    return () => this.committedListeners.delete(callback);
  }
  async flush(): Promise<void> { await this.lastWork; }
  private async commitHistory(pending: PendingHistoryCredit, wake: DetectionWake, previous: HistoryLedger): Promise<HistoryLedger> {
    const ledger = await this.deps.historyLedger.apply(pending, pending.timezone ?? wake.timezone);
    this.assertGeneration(wake.generation);
    detectionStore.getState().patch({
      creditedThrough: {
        ...detectionStore.getState().data.creditedThrough,
        steps: Math.max(previous.through ?? pending.from, ledger.through ?? pending.to),
      },
      pendingHistory: null,
    });
    try {
      await this.persist();
    } catch (error) {
      detectionStore.getState().patch({ pendingHistory: pending });
      throw error;
    }
    this.assertGeneration(wake.generation);
    return ledger;
  }
  noteCoverageLost(now: number, walkingGraceMs: number, generation: number): Promise<void> {
    return this.enqueue(async () => {
      this.assertGeneration(generation);
      const data = detectionStore.getState().data;
      detectionStore.getState().patch({
        walking: reduceWalking(data.walking, { kind: 'evidence', at: now, qualifying: 'unknown' }, now, walkingGraceMs),
        propped: reducePropped(data.propped, { kind: 'coverageLost', at: now }, now),
        gym: reduceGym(data.gym, { kind: 'coverageLost' }, now),
        observedAt: now,
      });
      await this.commitObserved(now, generation, undefined, 'coverage_lost');
    });
  }
  invalidateGymRegion(regionId: string, now: number, generation: number): Promise<void> {
    return this.enqueue(async () => {
      this.assertGeneration(generation);
      const data = detectionStore.getState().data;
      detectionStore.getState().patch({ gym: reduceGym(data.gym, { kind: 'coverageLost', regionId }, now) });
      await this.commitObserved(now, generation, undefined, 'gym_region_invalidated');
    });
  }
  async startProppedScan(now: number, generation: number): Promise<number | null> {
    let scanGeneration: number | null = null;
    await this.applyPropped({ kind: 'startScan', at: now, foreground: true }, now, generation, (state) => {
      scanGeneration = state.scanGeneration;
    });
    return scanGeneration;
  }
  completeProppedScan(now: number, scanGeneration: number, generation: number): Promise<void> {
    return this.applyPropped(
      { kind: 'scanPass', at: now, generation: scanGeneration, foreground: true },
      now,
      generation,
    );
  }
  cancelProppedScan(now: number, generation: number): Promise<void> {
    return this.applyPropped({ kind: 'scanCancel', at: now }, now, generation);
  }
  reconcileMotion(now: number, graceMs: number, generation: number): Promise<void> {
    return this.enqueue(async () => {
      this.assertGeneration(generation);
      const evidence = this.deps.motion.reconcile(now);
      const data = detectionStore.getState().data;
      let walking = reduceWalking(
        data.walking,
        { kind: 'evidence', at: evidence.observedAt, qualifying: evidence.qualifying, verifiedMs: evidence.verifiedMs, stopped: evidence.stopped },
        now,
        graceMs,
      );
      walking = reduceWalking(walking, { kind: 'tick' }, now, graceMs);
      let propped = data.propped;
      if (walking.phase === 'active' && propped.phase === 'handheld')
        propped = reducePropped(propped, { kind: 'walkingQualified', at: now }, now);
      else if (walking.phase === 'inactive' && propped.phase === 'active')
        propped = reducePropped(propped, { kind: 'walkingStopped', at: now }, now);
      detectionStore.getState().patch({ walking, propped, observedAt: now });
      await this.commitObserved(now, generation, undefined, 'manual_motion');
    });
  }
  private async applyMotion(evidence: MotionEvidence, graceMs: number, generation: number): Promise<void> {
    this.assertGeneration(generation);
    const data = detectionStore.getState().data;
    const walking = reduceWalking(
        data.walking,
        { kind: 'evidence', at: evidence.observedAt, qualifying: evidence.qualifying, verifiedMs: evidence.verifiedMs, stopped: evidence.stopped },
        evidence.observedAt,
        graceMs,
      );
    let propped = data.propped;
    if (walking.phase === 'active' && propped.phase === 'handheld')
      propped = reducePropped(propped, { kind: 'walkingQualified', at: evidence.observedAt }, evidence.observedAt);
    else if (walking.phase === 'inactive' && propped.phase === 'active')
      propped = reducePropped(propped, { kind: 'walkingStopped', at: evidence.observedAt }, evidence.observedAt);
    detectionStore.getState().patch({
      walking,
      propped,
      observedAt: evidence.observedAt,
    });
    await this.commitObserved(evidence.observedAt, generation, undefined, 'live_motion');
  }
  private applyPropped(
    event: ProppedEvent,
    now: number,
    generation: number,
    after?: (state: ProppedState) => void,
  ): Promise<void> {
    return this.enqueue(async () => {
      this.assertGeneration(generation);
      const next = reducePropped(detectionStore.getState().data.propped, event, now);
      detectionStore.getState().patch({ propped: next, observedAt: now });
      await this.commitObserved(now, generation, undefined, 'propped');
      after?.(next);
    });
  }
  private assertGeneration(expected: number): void {
    if (detectionStore.getState().data.generation !== expected) throw new Error('Obsolete detection generation');
  }
  private persist(): Promise<void> {
    return (this.deps.persist ?? persistDetectionState)();
  }
  private traceDetectorPersist(trigger: string, status: string, before: DetectionData, after: DetectionData): void {
    if (!__LINKED_RECORDER_TRACE__) return;
    linkedTrace.record('detector_persist', {
      trigger,
      status,
      generation: after.generation,
      observedAtWallMs: after.observedAt,
      phaseBefore: before.walking.phase,
      phaseAfter: after.walking.phase,
      watermarkBefore: before.walking.watermark,
      watermarkAfter: after.walking.watermark,
      qualifyingSinceBefore: before.walking.qualifyingSince,
      qualifyingSinceAfter: after.walking.qualifyingSince,
      activeSinceBefore: before.walking.activeSince,
      activeSinceAfter: after.walking.activeSince,
      lastEvidenceAtBefore: before.walking.lastEvidenceAt,
      lastEvidenceAtAfter: after.walking.lastEvidenceAt,
      lastQualifyingBefore: before.walking.lastQualifying,
      lastQualifyingAfter: after.walking.lastQualifying,
      graceEndsAtBefore: before.walking.graceEndsAt,
      graceEndsAtAfter: after.walking.graceEndsAt,
    });
  }
  private async commitObserved(
    at: number,
    generation: number,
    timezone = this.deps.walkingTimezone?.(),
    trigger = 'commit',
  ): Promise<void> {
    const before = __LINKED_RECORDER_TRACE__ ? this.lastDurableTraceData ?? detectionStore.getState().data : null;
    const candidate = __LINKED_RECORDER_TRACE__ ? detectionStore.getState().data : null;
    try {
      await this.persist();
    } catch (error) {
      if (__LINKED_RECORDER_TRACE__) this.traceDetectorPersist(trigger, 'failed', before!, candidate!);
      throw error;
    }
    this.assertGeneration(generation);
    if (__LINKED_RECORDER_TRACE__) {
      this.traceDetectorPersist(trigger, 'returned', before!, candidate!);
      this.lastDurableTraceData = candidate!;
    }
    if (this.deps.walkingDurationLedger) {
      if (!timezone) throw new Error('Walking duration timezone unavailable');
      const data = detectionStore.getState().data;
      const verified = isMeasuredWalkingState(data);
      await this.deps.walkingDurationLedger.observe({ generation, at: Math.max(at, data.walking.watermark, data.propped.watermark, data.gym.watermark), verified, timezone });
      this.assertGeneration(generation);
    }
    this.notifyCommitted();
  }
  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.queue.catch(() => undefined).then(operation);
    this.lastWork = next;
    this.queue = next.then(() => undefined, () => undefined);
    return next;
  }
  private notifyCommitted(): void { this.committedListeners.forEach((listener) => { try { listener(); } catch (error) { this.deps.onError?.(error); } }); }
  private runLifecycle(operation: () => Promise<void>): Promise<void> {
    const next = this.lifecycle.catch(() => undefined).then(operation);
    this.lifecycle = next.catch(() => undefined);
    return next;
  }
}

export function isMeasuredWalkingState(data: Pick<DetectionData, 'walking' | 'propped'>): boolean {
  return data.walking.phase === 'active' || (data.propped.phase === 'active' && data.propped.verifiedSince != null);
}

function nextLocalMidnight(from: number, timezone: string): number {
  const day = dayKey(new Date(from).toISOString(), timezone);
  const next = Date.parse(localDayStart(addDays(day, 1), timezone));
  if (!Number.isFinite(next) || next <= from) throw new Error('Invalid local history boundary');
  return next;
}
