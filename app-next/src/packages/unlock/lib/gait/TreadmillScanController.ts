import type { GaitKeypointSample, GaitVisionProvider } from '../../../ports/GaitVisionProvider';
import { GAIT_SETTINGS, WindowedGaitDetector, type WindowedGaitResult } from './WindowedGaitDetector';

export const GAIT_FAILURE_GRACE_MS = 30_000;
export type TreadmillScanPhase = 'idle' | 'scanning' | 'needsFraming' | 'verified' | 'permissionDenied' | 'expired';
export type TreadmillScanSnapshot = Readonly<{ phase: TreadmillScanPhase; confidence: number }>;
export interface TreadmillScanDependencies {
  readonly provider: GaitVisionProvider;
  readonly now: () => number;
  readonly schedule?: (callback: () => void, delayMs: number) => () => void;
  readonly onVerified: () => void | boolean | Promise<void | boolean>;
  readonly onUnverified: () => void | Promise<void>;
  readonly onPermissionDenied: () => void | Promise<void>;
  readonly onExpired: () => void | Promise<void>;
}
const IDLE: TreadmillScanSnapshot = Object.freeze({ phase: 'idle', confidence: 0 });
export class TreadmillScanController {
  private dependencies: TreadmillScanDependencies;
  private result: WindowedGaitResult | undefined;
  private detector: WindowedGaitDetector | undefined;
  private listeners = new Set<() => void>();
  private snapshot = IDLE;
  private generation = 0;
  private starting = false;
  private finishing = false;
  private qualified = false;
  private everQualified = false;
  private lastWalkingAt = -Infinity;
  private qualificationWork: Promise<void> = Promise.resolve();
  private lifecycle: Promise<void> = Promise.resolve();
  private unsubscribe: (() => void) | undefined;
  private timers: (() => void)[] = [];
  private lastPublishedAt = -Infinity;
  constructor(dependencies: TreadmillScanDependencies) {
    this.dependencies = dependencies;
  }
  getSnapshot(): TreadmillScanSnapshot {
    return this.snapshot;
  }
  getResult() {
    return this.result;
  }
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  start(): Promise<void> {
    if (this.starting || this.detector || this.finishing) return this.lifecycle;
    const generation = ++this.generation;
    this.starting = true;
    this.result = undefined;
    this.everQualified = false;
    this.lastWalkingAt = -Infinity;
    this.publish({ phase: 'scanning', confidence: 0 });
    const work = this.lifecycle
      .catch(() => undefined)
      .then(async () => {
        if (generation !== this.generation) return;
        try {
          await this.dependencies.provider.start();
          if (generation !== this.generation) {
            await this.dependencies.provider.stop();
            return;
          }
          this.starting = false;
          this.detector = new WindowedGaitDetector({ startedAtMs: this.dependencies.now() });
          this.unsubscribe = this.dependencies.provider.onSample((sample) => this.process(sample, generation));
          this.schedule(() => this.timeout(generation), GAIT_SETTINGS.timeoutMs);
          this.poll(generation);
        } catch (error) {
          if (generation !== this.generation) return;
          this.starting = false;
          await this.dependencies.provider.stop().catch(() => undefined);
          if (generation !== this.generation) return;
          if (
            typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            error.code === 'ERR_GAIT_VISION_DENIED'
          ) {
            this.publish({ phase: 'permissionDenied', confidence: 0 });
            await this.dependencies.onPermissionDenied();
            return;
          }
          this.publish(IDLE);
          throw error;
        }
      });
    this.lifecycle = work;
    return work;
  }
  stop(): Promise<void> {
    ++this.generation;
    this.starting = false;
    this.finishing = false;
    this.detach();
    this.setQualified(false, this.generation);
    this.publish(IDLE);
    const work = this.lifecycle.catch(() => undefined).then(async () => {
      await this.dependencies.provider.stop();
      await this.qualificationWork;
    });
    this.lifecycle = work;
    return work;
  }
  private process(sample: GaitKeypointSample, generation: number): void {
    if (generation !== this.generation || this.finishing || !this.detector) return;
    const result = this.detector.process(sample, this.dependencies.now());
    this.result = result;
    this.updateQualification(result, generation);
  }
  private updateQualification(result: WindowedGaitResult, generation: number): void {
    const now = this.dependencies.now();
    const walking = result.classification === 'walking' && (result.complete || this.qualified);
    if (walking) this.lastWalkingAt = now;
    const lostCoverage = ['coverage', 'timestamp', 'framingJump', 'recentStillness'].includes(result.reason);
    const qualified = walking || (this.qualified && !lostCoverage && now - this.lastWalkingAt < 2500);
    this.setQualified(qualified, generation);
    if (!qualified) this.publish({ phase: 'scanning', confidence: result.confidence });
  }
  private setQualified(qualified: boolean, generation: number): void {
    if (qualified === this.qualified) return;
    this.qualified = qualified;
    if (qualified) this.everQualified = true;
    this.qualificationWork = this.qualificationWork.catch(() => undefined).then(async () => {
      if (!qualified) {
        await this.dependencies.onUnverified();
        return;
      }
      if (generation !== this.generation || !this.qualified) return;
      let accepted = false;
      try {
        accepted = (await this.dependencies.onVerified()) !== false;
      } catch {
        accepted = false;
      }
      if (generation !== this.generation || !this.qualified) return;
      if (accepted) this.publish({ phase: 'verified', confidence: 1 });
      else {
        this.qualified = false;
        await this.dependencies.onUnverified();
        this.publish({ phase: 'scanning', confidence: 0 });
      }
    });
  }
  private poll(generation: number): void {
    this.schedule(() => {
      if (generation !== this.generation || !this.detector || this.finishing) return;
      this.updateQualification(this.detector.getResult(this.dependencies.now()), generation);
      this.poll(generation);
    }, 200);
  }
  private timeout(generation: number): void {
    if (generation !== this.generation || this.finishing || this.everQualified) return;
    this.detach();
    this.publish({ phase: 'needsFraming', confidence: 0 });
    void this.dependencies.provider.stop().catch(() => undefined);
    this.schedule(() => {
      void this.finish(generation);
    }, GAIT_FAILURE_GRACE_MS);
  }
  private async finish(generation: number): Promise<void> {
    if (generation !== this.generation || this.finishing) return;
    this.finishing = true;
    this.detach();
    await this.dependencies.provider.stop().catch(() => undefined);
    if (generation !== this.generation) return;
    this.finishing = false;
    this.publish({ phase: 'expired', confidence: 0 });
    await this.dependencies.onExpired();
  }

  private detach(): void {
    this.timers.splice(0).forEach((cancel) => cancel());
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    this.detector = undefined;
  }
  private schedule(callback: () => void, delayMs: number): void {
    const schedule =
      this.dependencies.schedule ??
      ((cb, ms) => {
        const id = setTimeout(cb, ms);
        return () => clearTimeout(id);
      });
    const cancel = schedule(() => {
      this.timers = this.timers.filter((v) => v !== cancel);
      callback();
    }, delayMs);
    this.timers.push(cancel);
  }
  private publish(snapshot: TreadmillScanSnapshot): void {
    if (snapshot.phase === this.snapshot.phase && snapshot.confidence === this.snapshot.confidence) return;
    const now = this.dependencies.now();
    if (snapshot.phase === this.snapshot.phase && now - this.lastPublishedAt < 200) return;
    this.lastPublishedAt = now;
    this.snapshot = Object.freeze(snapshot);
    this.listeners.forEach((listener) => listener());
  }
}
