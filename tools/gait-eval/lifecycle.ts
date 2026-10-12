import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { replayContinuous, VirtualClock } from './replay';
import { TreadmillScanController } from '../../app-next/src/packages/unlock/lib/gait/TreadmillScanController';
import type { GaitKeypointSample } from '../../app-next/src/packages/ports/GaitVisionProvider';
const output = resolve(process.argv[2] ?? '.excer/treadmill-loop/lifecycle');
mkdirSync(output, { recursive: true });
const samples: GaitKeypointSample[] = Array.from({ length: 601 }, (_, index) => ({
  timestampMs: index * 1000 / 15,
  landmarks: {},
  head: { x: 0.5, y: 0.4 + 0.02 * Math.sin(index / 15 * 2 * Math.PI * 1.8), height: 0.2, confidence: 1 },
}));
const sustained = await replayContinuous(samples);
const gap = await replayContinuous(samples.filter((sample) => sample.timestampMs < 12000 || sample.timestampMs > 14000));
const clock = new VirtualClock();
let receiver: ((sample: GaitKeypointSample) => void) | undefined;
let release: (() => void) | undefined;
let activeGrant = false;
const controller = new TreadmillScanController({
  provider: {
    start: async () => {},
    stop: async () => {},
    onSample: (callback) => { receiver = callback; return () => { receiver = undefined; }; },
  },
  now: () => clock.now,
  schedule: (callback, delay) => clock.schedule(callback, delay),
  onVerified: async () => { await new Promise<void>((resolve) => { release = resolve; }); activeGrant = true; return true; },
  onUnverified: () => { activeGrant = false; },
  onPermissionDenied: () => {},
  onExpired: () => {},
});
await controller.start();
for (const sample of samples.slice(0, 90)) {
  await clock.advance(sample.timestampMs);
  receiver?.(sample);
  await clock.flush();
}
const pendingPassObserved = release !== undefined;
const stopping = controller.stop();
release?.();
await stopping;
const cancellation = { pendingPassObserved, activeGrant, phase: controller.getSnapshot().phase };
const passed = sustained.transitions.length === 1 && sustained.transitions[0].qualified && sustained.staleTransitions.some((transition) => !transition.qualified) &&
  gap.transitions.some((transition) => !transition.qualified && transition.at >= 12000 && transition.at < 12500) &&
  gap.transitions.some((transition) => transition.qualified && transition.at > 14000) &&
  pendingPassObserved && !activeGrant && cancellation.phase === 'idle';
const report = { passed, sustained, gap, cancellation };
writeFileSync(join(output, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed, sustained: sustained.transitions, stale: sustained.staleTransitions, gap: gap.transitions, cancellation }, null, 2));
if (!passed) process.exitCode = 1;
