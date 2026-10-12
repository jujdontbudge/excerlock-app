import { createProppedState, reducePropped } from '../../app-next/src/packages/activity/proppedMachine';
import { WalkingDurationLedger } from '../../app-next/src/packages/activity/WalkingDurationLedger';
import { GaitPeriodicityDetector } from "./LegacyDetector";
import { TreadmillScanController as LegacyController } from "./LegacyController";
import { TreadmillScanController } from "../../app-next/src/packages/unlock/lib/gait/TreadmillScanController";
import {
  WindowedGaitDetector,
  GAIT_SETTINGS,
} from "../../app-next/src/packages/unlock/lib/gait/WindowedGaitDetector";
import type {
  GaitKeypointSample,
  GaitVisionProvider,
} from "../../app-next/src/packages/ports/GaitVisionProvider";
export class VirtualClock {
  now = 0;
  private sequence = 0;
  private tasks = new Map<number, { at: number; callback: () => void }>();
  set = (callback: () => void, delay: number) => {
    const id = ++this.sequence;
    this.tasks.set(id, { at: this.now + delay, callback });
    return id;
  };
  clear = (id: number) => {
    this.tasks.delete(id);
  };
  schedule = (callback: () => void, delay: number) => {
    const id = this.set(callback, delay);
    return () => this.clear(id);
  };
  async advance(at: number) {
    for (;;) {
      const next = [...this.tasks]
        .filter(([, task]) => task.at <= at)
        .sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
      if (!next) break;
      this.now = next[1].at;
      this.tasks.delete(next[0]);
      next[1].callback();
      await this.flush();
    }
    this.now = at;
    await this.flush();
  }
  async flush() {
    for (let i = 0; i < 12; i++) await Promise.resolve();
  }
}
export type ReplayOutcome = {
  passed: boolean;
  timeToPassMs: number | null;
  reason: string;
  reasons: Record<string, number>;
  phase: string;
};
export async function replay(
  samples: readonly GaitKeypointSample[],
  legacy = false,
): Promise<ReplayOutcome> {
  const clock = new VirtualClock();
  const callbacks = new Set<(sample: GaitKeypointSample) => void>();
  let running = false,
    passAt: number | null = null,
    reason = "noSamples";
  const reasons: Record<string, number> = {};
  const provider: GaitVisionProvider = {
    start: async () => {
      running = true;
    },
    stop: async () => {
      running = false;
    },
    onSample: (callback) => {
      callbacks.add(callback);
      return () => callbacks.delete(callback);
    },
  };
  const common = {
    provider,
    now: () => clock.now,
    onVerified: () => {
      passAt = clock.now;
      return true;
    },
    onUnverified: () => {},
    onExpired: () => {},
    onPermissionDenied: () => {},
  };
  const controller = legacy
    ? new LegacyController({
        ...common,
        onVerified: () => {
          passAt = clock.now;
        },
        schedule: (cb, ms) =>
          clock.set(cb, ms) as unknown as ReturnType<typeof setTimeout>,
        clear: (id) => clock.clear(id as unknown as number),
      })
    : new TreadmillScanController({ ...common, schedule: clock.schedule });
  const detector = legacy
    ? new GaitPeriodicityDetector({ startedAtMs: 0 })
    : new WindowedGaitDetector({ startedAtMs: 0 });
  await controller.start();
  for (const sample of samples) {
    const at = sample.analysisTimestampMs ?? sample.timestampMs;
    if (Number.isFinite(at) && at >= clock.now) await clock.advance(at);
    const decision = legacy ? detector.process(sample) : undefined;
    if (running) callbacks.forEach((callback) => callback(sample));
    await clock.flush();
    const result = legacy
      ? decision
      : (controller as TreadmillScanController).getResult();
    reason = result
      ? "reason" in result
        ? String(result.reason)
        : result.classification
      : "noSamples";
    reasons[reason] = (reasons[reason] ?? 0) + 1;
    if (passAt !== null) break;
  }
  await clock.advance(
    Math.max(clock.now, legacy ? 35_000 : GAIT_SETTINGS.timeoutMs + 30_000),
  );
  const phase = controller.getSnapshot().phase;
  await controller.stop();
  return {
    passed: passAt !== null,
    timeToPassMs: passAt,
    reason: passAt !== null ? "walking" : reason,
    reasons,
    phase,
  };
}
export async function replayContinuous(samples: readonly GaitKeypointSample[], start = 0) {
  const clock = new VirtualClock();
  clock.now = start;
  let receiver: ((sample: GaitKeypointSample) => void) | undefined;
  let running = false;
  const transitions: { at: number; qualified: boolean; reason?: string }[] = [];
  let propped = createProppedState(start);
  let stored: string | null = null;
  const ledger = new WalkingDurationLedger({ getItem: async () => stored, setItem: async (_, value) => { stored = value; } });
  const observeProgress = () => ledger.observe({ generation: 0, at: clock.now, verified: propped.phase === 'propped' && propped.verifiedSince != null, timezone: 'UTC' });
  const controller = new TreadmillScanController({
    provider: {
      start: async () => { running = true; },
      stop: async () => { running = false; },
      onSample: (callback) => { receiver = callback; return () => { receiver = undefined; }; },
    },
    now: () => clock.now,
    schedule: (callback, delay) => clock.schedule(callback, delay),
    onVerified: () => {
      propped = reducePropped(propped, { kind: 'startScan', at: clock.now, foreground: true }, clock.now);
      propped = reducePropped(propped, { kind: 'scanPass', at: clock.now, foreground: true, generation: propped.scanGeneration! }, clock.now);
      transitions.push({ at: clock.now, qualified: true }); return true;
    },
    onUnverified: () => {
      propped = reducePropped(propped, { kind: 'coverageLost', at: clock.now }, clock.now);
      transitions.push({ at: clock.now, qualified: false, reason: controller.getResult()?.reason });
    },
    onPermissionDenied: () => {},
    onExpired: () => {},
  });
  await controller.start();
  for (const sample of samples) {
    const at = sample.analysisTimestampMs ?? sample.timestampMs;
    if (at < start) continue;
    await clock.advance(at);
    if (running) receiver?.(sample);
    await clock.flush();
    await observeProgress();
  }
  const progress = await ledger.read();
  const observedTransitions = [...transitions];
  await clock.advance(clock.now + 1000);
  const staleTransitions = transitions.slice(observedTransitions.length);
  await controller.stop();
  return { transitions: observedTransitions, staleTransitions, progress };
}
