import { detectionStore, persistDetectionState } from '../../state/detectionStore';
import { reduceWalking } from '../../domain/walkingMachine';
import { reducePropped } from '../../domain/proppedMachine';
import { reduceGym } from '../../domain/gymMachine';
import type { GymVisitLog } from '../../engine/signals/location/GymVisitLog';
import type { MotionAdapter, MotionEvidence } from './MotionAdapter';
import type { PlacementAdapter } from './PlacementAdapter';
export type DetectionWake = {
  now: number;
  dayStart: number;
  walkingGraceMs: number;
  generation: number;
  source: 'foreground' | 'background' | 'geofence' | 'manual';
};
export type HistoryCredit = { idempotencyKey: string; from: number; to: number; steps: number };
export class DetectionService {
  private disposers: (() => void)[] = [];
  private queue: Promise<void> = Promise.resolve();
  private lifecycle: Promise<void> = Promise.resolve();
  constructor(
    private readonly deps: {
      motion: MotionAdapter;
      placement: PlacementAdapter;
      gymLog: GymVisitLog;
      creditHistory: (credit: HistoryCredit) => Promise<void>;
      onError?: (error: unknown) => void;
    },
  ) {}
  start(walkingGraceMs: number): Promise<void> {
    return this.runLifecycle(async () => {
      if (this.disposers.length) return;
      const generation = detectionStore.getState().data.generation;
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
            detectionStore.getState().patch({
              propped: reducePropped(
                data.propped,
                { kind, at: result.transition!.timestampMs },
                result.transition!.timestampMs,
              ),
              observedAt: result.transition!.timestampMs,
            });
            await persistDetectionState();
            this.assertGeneration(generation);
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
      this.disposers.splice(0).forEach((dispose) => dispose());
      await Promise.allSettled([this.deps.motion.stop(), this.deps.placement.stop()]);
      await this.queue;
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
        { kind: 'evidence', at: motion.observedAt, qualifying: motion.qualifying },
        wake.now,
        wake.walkingGraceMs,
      );
      walking = reduceWalking(walking, { kind: 'tick' }, wake.now, wake.walkingGraceMs);
      let propped = reducePropped(before.propped, { kind: 'tick' }, wake.now);
      if (placement.placement === 'unknown' && before.propped.phase !== 'inactive')
        propped = reducePropped(propped, { kind: 'coverageLost', at: wake.now }, wake.now);
      const gym = reduceGym(before.gym, { kind: 'records', records }, wake.now);
      const cursor = Math.max(wake.dayStart, before.creditedThrough.steps ?? wake.dayStart);
      if (cursor < wake.now) {
        const { steps } = await this.deps.motion.querySteps(cursor, wake.now);
        this.assertGeneration(wake.generation);
        const idempotencyKey = `steps:${wake.generation}:${cursor}:${wake.now}`;
        await this.deps.creditHistory({ idempotencyKey, from: cursor, to: wake.now, steps });
        this.assertGeneration(wake.generation);
      }
      detectionStore.getState().patch({
        walking,
        propped,
        gym,
        observedAt: wake.now,
        creditedThrough: { ...before.creditedThrough, steps: wake.now },
      });
      await persistDetectionState();
      this.assertGeneration(wake.generation);
    });
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
      await persistDetectionState();
      this.assertGeneration(generation);
    });
  }
  private async applyMotion(evidence: MotionEvidence, graceMs: number, generation: number): Promise<void> {
    this.assertGeneration(generation);
    const data = detectionStore.getState().data;
    detectionStore.getState().patch({
      walking: reduceWalking(
        data.walking,
        { kind: 'evidence', at: evidence.observedAt, qualifying: evidence.qualifying },
        evidence.observedAt,
        graceMs,
      ),
      observedAt: evidence.observedAt,
    });
    await persistDetectionState();
    this.assertGeneration(generation);
  }
  private assertGeneration(expected: number): void {
    if (detectionStore.getState().data.generation !== expected) throw new Error('Obsolete detection generation');
  }
  private enqueue(operation: () => Promise<void>): Promise<void> {
    const next = this.queue.catch(() => undefined).then(operation);
    this.queue = next.catch(() => undefined);
    return next;
  }
  private runLifecycle(operation: () => Promise<void>): Promise<void> {
    const next = this.lifecycle.catch(() => undefined).then(operation);
    this.lifecycle = next.catch(() => undefined);
    return next;
  }
}
