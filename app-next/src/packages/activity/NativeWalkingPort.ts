import type { Rule } from '../model/types';
import { proppedRelief } from './proppedMachine';
import { WALK_QUALIFY_MS } from './walkingMachine';
import type { WalkingPort, WalkingStatus } from '../ports/WalkingPort';
import { inactiveWalkingStatus } from '../ports/WalkingPort';
import { detectionStore } from './detectionStore';
import type { DetectionService } from './DetectionService';
import type { MotionAdapter, MotionEvidence } from './lib/detection/MotionAdapter';
import type { PlacementAdapter } from './lib/detection/PlacementAdapter';

type Service = Pick<
  DetectionService,
  'start' | 'reconcileMotion' | 'startProppedScan' | 'completeProppedScan' | 'cancelProppedScan'
>;

export type NativeWalkingPortOptions = {
  service: Service;
  motion: MotionAdapter;
  placement: PlacementAdapter;
  walkingGraceMs(): number;
  resolveRuleId?(): string | null;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  onError?: (error: unknown) => void;
};

export class NativeWalkingPort implements WalkingPort {
  private ruleId: string | null = null;
  private scanGeneration: number | null = null;
  private operationGeneration = 0;
  private stepBaseline: number | null = null;
  private readonly now: () => number;
  private readonly sleep: (ms: number) => Promise<void>;
  private lastSnapshot: WalkingStatus | null = null;
  private localListeners = new Set<() => void>();

  constructor(private readonly options: NativeWalkingPortOptions) {
    this.now = options.now ?? Date.now;
    this.sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  }

  async start(rule: Rule, options?: { placement: 'propped' | 'handheld' }): Promise<WalkingStatus> {
    this.assertStateRule(rule);
    const operation = ++this.operationGeneration;
    this.ruleId = rule.id;
    this.publishLocal();
    this.stepBaseline = this.options.motion.cumulativeSteps();
    await this.options.service.start(this.options.walkingGraceMs());
    if (operation !== this.operationGeneration) throw new Error('Walking start was cancelled');
    if (options?.placement === 'propped') {
      const generation = detectionStore.getState().data.generation;
      this.scanGeneration = await this.options.service.startProppedScan(this.now(), generation);
      if (operation !== this.operationGeneration) throw new Error('Walking scan was cancelled');
    }
    return this.snapshot();
  }

  async check(rule: Rule): Promise<boolean> {
    this.assertStateRule(rule);
    await this.start(rule, { placement: 'handheld' });
    const operation = this.operationGeneration;
    const deadline = this.now() + WALK_QUALIFY_MS;
    let qualifyingSince: number | null = null;
    while (operation === this.operationGeneration) {
      const now = this.now();
      const evidence = this.options.motion.reconcile(now);
      if (evidence.qualifying === true) qualifyingSince ??= now;
      else qualifyingSince = null;
      await this.options.service.reconcileMotion(now, this.options.walkingGraceMs(), detectionStore.getState().data.generation);
      if (operation !== this.operationGeneration) return false;
      if (qualifyingSince !== null && now - qualifyingSince >= WALK_QUALIFY_MS)
        return detectionStore.getState().data.walking.phase === 'active';
      if (now >= deadline) return false;
      await this.sleep(Math.min(100, deadline - now));
    }
    return false;
  }

  stop(): void {
    ++this.operationGeneration;
    const scan = this.scanGeneration;
    this.scanGeneration = null;
    this.ruleId = null;
    this.stepBaseline = null;
    this.publishLocal();
    if (scan !== null) {
      const data = detectionStore.getState().data;
      void this.options.service.cancelProppedScan(this.now(), data.generation).catch(this.options.onError);
    }
  }

  completeProppedScan(): boolean {
    const scan = this.scanGeneration;
    if (scan === null) return false;
    this.scanGeneration = null;
    const data = detectionStore.getState().data;
    void this.options.service.completeProppedScan(this.now(), scan, data.generation).catch(this.options.onError);
    return true;
  }

  snapshot(): WalkingStatus {
    const data = detectionStore.getState().data;
    const physical = this.options.placement.reconcile(this.now()).placement;
    const propped = proppedRelief(data.propped);
    const phase = propped ? 'active' : data.walking.phase;
    const since = data.walking.activeSince ?? data.walking.qualifyingSince;
    const next: WalkingStatus = {
      ...inactiveWalkingStatus,
      ruleId: this.ruleId ?? this.options.resolveRuleId?.() ?? null,
      phase,
      since: since === null ? null : new Date(since).toISOString(),
      placement: physical,
      proppedVerified: propped,
      proppedSince: data.propped.verifiedSince == null ? null : new Date(data.propped.verifiedSince).toISOString(),
    };
    const previous = this.lastSnapshot;
    if (previous && Object.keys(next).every((key) => previous[key as keyof WalkingStatus] === next[key as keyof WalkingStatus]))
      return previous;
    this.lastSnapshot = next;
    return next;
  }

  observe(callback: () => void): () => void {
    this.localListeners.add(callback);
    const stopStore = detectionStore.subscribe(callback);
    const stopPlacement = this.options.placement.subscribe(callback);
    return () => {
      this.localListeners.delete(callback);
      stopStore();
      stopPlacement();
    };
  }

  observeWalking(callback: (walking: boolean) => void): () => void {
    let last: boolean | null = null;
    const publish = (evidence: MotionEvidence) => {
      const next = evidence.qualifying === true;
      if (next !== last) {
        last = next;
        callback(next);
      }
    };
    publish(this.options.motion.reconcile(this.now()));
    return this.options.motion.subscribe(publish);
  }

  details(): { steps: number; walkingSeconds: number } {
    const walking = detectionStore.getState().data.walking;
    const cumulative = this.options.motion.cumulativeSteps();
    const steps = cumulative === null || this.stepBaseline === null ? 0 : Math.max(0, cumulative - this.stepBaseline);
    const end = walking.phase === 'active' ? this.now() : walking.lastEvidenceAt;
    const walkingSeconds = walking.activeSince === null || end === null ? 0 : Math.max(0, end - walking.activeSince) / 1000;
    return { steps, walkingSeconds };
  }

  treadmillFraming(): { ready: boolean; message: string; placement: 'propped' | 'handheld' } {
    const placement = this.options.placement.reconcile(this.now()).placement;
    return {
      ready: placement === 'propped',
      placement: placement === 'propped' ? 'propped' : 'handheld',
      message: placement === 'propped' ? 'Phone position is ready.' : 'Prop your phone so the camera can see you.',
    };
  }

  private assertStateRule(rule: Rule): void {
    if (!rule.enabled || rule.activity !== 'walking' || rule.mode.kind !== 'state')
      throw new Error('An enabled walking state condition is required');
  }

  private publishLocal(): void {
    this.localListeners.forEach((listener) => listener());
  }
}
