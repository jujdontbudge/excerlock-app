import type { GaitKeypointSample, GaitVisionProvider } from './GaitVisionProvider';
import { GAIT_SCAN_TIMEOUT_MS, GaitPeriodicityDetector } from './GaitPeriodicityDetector';

export const GAIT_FAILURE_GRACE_MS = 30_000;

export type TreadmillScanPhase = 'idle' | 'scanning' | 'needsFraming' | 'verified' | 'permissionDenied' | 'expired';

export type TreadmillScanSnapshot = Readonly<{
  phase: TreadmillScanPhase;
  confidence: number;
}>;

export interface TreadmillScanDependencies {
  readonly provider: GaitVisionProvider;
  readonly now: () => number;
  readonly onVerified: () => void | Promise<void>;
  readonly onPermissionDenied: () => void | Promise<void>;
  readonly onExpired: () => void | Promise<void>;
}

const IDLE: TreadmillScanSnapshot = Object.freeze({
  phase: 'idle',
  confidence: 0,
});

export class TreadmillScanController {
  private detector: GaitPeriodicityDetector | undefined;
  private failureDeadlineMs: number | undefined;
  private failureTimer: ReturnType<typeof setTimeout> | undefined;
  private finishing = false;
  private readonly listeners = new Set<() => void>();
  private scanStartedAtMs: number | undefined;
  private scanTimer: ReturnType<typeof setTimeout> | undefined;
  private snapshot: TreadmillScanSnapshot = IDLE;
  private started = false;
  private unsubscribe: (() => void) | undefined;

  public constructor(private readonly dependencies: TreadmillScanDependencies) {}

  public getSnapshot(): TreadmillScanSnapshot {
    return this.snapshot;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public async start(): Promise<void> {
    if (this.started || this.finishing) {
      return;
    }
    this.publish({ phase: 'scanning', confidence: 0 });
    this.unsubscribe = this.dependencies.provider.onSample((sample) => {
      this.process(sample);
    });
    try {
      await this.dependencies.provider.start();
    } catch (error) {
      this.unsubscribe?.();
      this.unsubscribe = undefined;
      if (isCameraPermissionDenied(error)) {
        this.publish({ phase: 'permissionDenied', confidence: 0 });
        await this.dependencies.onPermissionDenied();
        return;
      }
      this.publish(IDLE);
      throw error;
    }
    this.started = true;
    this.beginScan(this.dependencies.now());
  }

  public async stop(): Promise<void> {
    await this.cleanUp();
    this.publish(IDLE);
  }

  private beginScan(startedAtMs: number): void {
    this.scanStartedAtMs = startedAtMs;
    this.detector = new GaitPeriodicityDetector({ startedAtMs });
    this.scheduleScanTimeout();
  }

  private process(sample: GaitKeypointSample): void {
    if (this.finishing || this.detector === undefined) {
      return;
    }
    const result = this.detector.process(sample);
    if (result.classification === 'walking' && result.complete) {
      void this.finishVerified();
      return;
    }
    this.publish({
      phase: this.failureDeadlineMs === undefined ? 'scanning' : 'needsFraming',
      confidence: result.confidence,
    });
  }

  private scheduleScanTimeout(): void {
    const startedAtMs = this.scanStartedAtMs;
    if (startedAtMs === undefined) {
      return;
    }
    if (this.scanTimer !== undefined) {
      clearTimeout(this.scanTimer);
    }
    this.scanTimer = setTimeout(
      () => {
        this.scanTimer = undefined;
        this.handleScanTimeout();
      },
      Math.max(0, startedAtMs + GAIT_SCAN_TIMEOUT_MS - this.dependencies.now()),
    );
  }

  private handleScanTimeout(): void {
    const detector = this.detector;
    if (detector === undefined || this.finishing) {
      return;
    }
    const now = this.dependencies.now();
    const result = detector.getResult(now);
    if (!result.complete) {
      this.scheduleScanTimeout();
      return;
    }
    if (result.classification === 'walking') {
      void this.finishVerified();
      return;
    }
    if (this.failureDeadlineMs === undefined) {
      this.failureDeadlineMs = now + GAIT_FAILURE_GRACE_MS;
      this.failureTimer = setTimeout(() => {
        this.failureTimer = undefined;
        void this.finishExpired();
      }, GAIT_FAILURE_GRACE_MS);
    }
    this.publish({ phase: 'needsFraming', confidence: 0 });
    this.beginScan(now);
  }

  private async finishVerified(): Promise<void> {
    if (this.finishing) {
      return;
    }
    this.finishing = true;
    await this.cleanUp();
    this.publish({ phase: 'verified', confidence: 1 });
    await this.dependencies.onVerified();
  }

  private async finishExpired(): Promise<void> {
    if (this.finishing) {
      return;
    }
    this.finishing = true;
    await this.cleanUp();
    this.publish({ phase: 'expired', confidence: 0 });
    await this.dependencies.onExpired();
  }

  private async cleanUp(): Promise<void> {
    if (this.scanTimer !== undefined) {
      clearTimeout(this.scanTimer);
      this.scanTimer = undefined;
    }
    if (this.failureTimer !== undefined) {
      clearTimeout(this.failureTimer);
      this.failureTimer = undefined;
    }
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    this.detector = undefined;
    this.scanStartedAtMs = undefined;
    this.failureDeadlineMs = undefined;
    const wasStarted = this.started;
    this.started = false;
    if (wasStarted) {
      await this.dependencies.provider.stop().catch(() => undefined);
    }
    this.finishing = false;
  }

  private publish(snapshot: TreadmillScanSnapshot): void {
    this.snapshot = Object.freeze(snapshot);
    this.listeners.forEach((listener) => listener());
  }
}

function isCameraPermissionDenied(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ERR_GAIT_VISION_DENIED';
}
