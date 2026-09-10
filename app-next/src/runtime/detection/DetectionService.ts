import { detectionStore } from '../../state/detectionStore';
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
  source: 'foreground' | 'background' | 'geofence' | 'manual';
};
export type HistoryCredit = { from: number; to: number; steps: number };

/** Runtime-root/headless input boundary. It owns feeds, never shielding policy. */
export class DetectionService {
  private disposers: (() => void)[] = [];
  private writes: Promise<void> = Promise.resolve();
  constructor(
    private readonly deps: {
      motion: MotionAdapter;
      placement: PlacementAdapter;
      gymLog: GymVisitLog;
      creditHistory: (credit: HistoryCredit) => Promise<void>;
    },
  ) {}

  async start(walkingGraceMs: number): Promise<void> {
    if (this.disposers.length) return;
    this.disposers.push(
      this.deps.motion.subscribe((evidence) => this.enqueue(() => this.applyMotion(evidence, walkingGraceMs))),
    );
    this.disposers.push(
      this.deps.placement.subscribe((result) => {
        if (!result.transition) return;
        this.enqueue(() => {
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
        });
      }),
    );
    await Promise.all([this.deps.motion.start(), this.deps.placement.start()]);
  }

  async stop(): Promise<void> {
    this.disposers.splice(0).forEach((dispose) => dispose());
    await Promise.all([this.deps.motion.stop(), this.deps.placement.stop()]);
    await this.writes;
  }

  async reconcileWake(wake: DetectionWake): Promise<void> {
    await this.writes;
    const before = detectionStore.getState().data;
    const motion = this.deps.motion.reconcile(wake.now);
    const placement = this.deps.placement.reconcile(wake.now);
    const records = await this.deps.gymLog.readAll();
    let walking = reduceWalking(
      before.walking,
      { kind: 'evidence', at: wake.now, qualifying: motion.qualifying },
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
      await this.deps.creditHistory({ from: cursor, to: wake.now, steps });
    }
    detectionStore.getState().patch({
      walking,
      propped,
      gym,
      observedAt: wake.now,
      creditedThrough: { ...before.creditedThrough, steps: wake.now },
    });
  }

  async noteCoverageLost(now: number, walkingGraceMs: number): Promise<void> {
    await this.writes;
    const data = detectionStore.getState().data;
    detectionStore.getState().patch({
      walking: reduceWalking(data.walking, { kind: 'evidence', at: now, qualifying: 'unknown' }, now, walkingGraceMs),
      propped: reducePropped(data.propped, { kind: 'coverageLost', at: now }, now),
      gym: reduceGym(data.gym, { kind: 'coverageLost' }, now),
      observedAt: now,
    });
  }

  private applyMotion(evidence: MotionEvidence, graceMs: number): void {
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
  }
  private enqueue(operation: () => void): void {
    this.writes = this.writes.then(operation);
  }
}
