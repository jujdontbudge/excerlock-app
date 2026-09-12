/// <reference types="node" />

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { MotionAdapter } from '../../../app-next/src/runtime/detection/MotionAdapter';
import { createWalkingState, reduceWalking } from '../../../app-next/src/domain/walkingMachine';
import type {
  ActivitySample,
  CadenceSample,
  MotionProvider,
  Unsubscribe,
} from '../../../app-next/src/engine/signals/motion/MotionProvider';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(readFileSync(resolve(here, '../Fixtures/production-path.json'), 'utf8')) as {
  events: Array<{
    atMs: number;
    kind: 'activity' | 'cadence';
    classes?: ActivitySample['classes'];
    confidence?: ActivitySample['confidence'];
    startedAtMs?: number;
    stepsPerSecond?: number | null;
    cumulativeSteps?: number;
    expectedPhase: string;
    expectedQualification: boolean;
    expectedGraceEndsAtMs?: number;
  }>;
};

let now = 0;
const listeners = {
  activity: new Set<(sample: ActivitySample) => void>(),
  cadence: new Set<(sample: CadenceSample) => void>(),
};
const provider: MotionProvider = {
  getAvailability: () => ({ activity: true, cadence: true, stepCounting: true }),
  getAuthorizationStatus: () => 'authorized',
  requestAuthorization: async () => 'authorized',
  start: async () => undefined,
  stop: async () => undefined,
  on(kind, callback): Unsubscribe {
    if (kind === 'activity') listeners.activity.add(callback as (sample: ActivitySample) => void);
    else if (kind === 'cadence') listeners.cadence.add(callback as (sample: CadenceSample) => void);
    return () => {
      if (kind === 'activity') listeners.activity.delete(callback as (sample: ActivitySample) => void);
      else if (kind === 'cadence') listeners.cadence.delete(callback as (sample: CadenceSample) => void);
    };
  },
  querySteps: async () => ({ steps: 0 }),
  queryActivity: async () => [],
};

async function main(): Promise<void> {
  const adapter = new MotionAdapter(provider, () => now);
  let state = createWalkingState(0);
  let latest: ReturnType<MotionAdapter['reconcile']> | undefined;
  adapter.subscribe((evidence) => {
    latest = evidence;
    state = reduceWalking(
      state,
      { kind: 'evidence', at: evidence.observedAt, qualifying: evidence.qualifying },
      evidence.observedAt,
      30_000,
    );
  });
  await adapter.start();

  for (const event of fixture.events) {
    now = event.atMs;
    if (event.kind === 'activity') {
      const sample: ActivitySample = {
        classes: event.classes ?? ['unknown'],
        confidence: event.confidence ?? 'low',
        startedAt: event.startedAtMs ?? event.atMs,
        receivedAt: event.atMs,
      };
      listeners.activity.forEach((listener) => listener(sample));
    } else {
      const sample: CadenceSample = {
        stepsPerSecond: event.stepsPerSecond ?? null,
        cumulativeSteps: event.cumulativeSteps ?? 0,
        asOf: event.atMs,
      };
      listeners.cadence.forEach((listener) => listener(sample));
    }
    assert(latest, `No evidence emitted at ${event.atMs}`);
    assert.equal(latest.qualifying, event.expectedQualification, `qualification at ${event.atMs}`);
    assert.equal(state.phase, event.expectedPhase, `phase at ${event.atMs}`);
    if (event.expectedGraceEndsAtMs !== undefined) {
      assert.equal(state.graceEndsAt, event.expectedGraceEndsAtMs, `grace deadline at ${event.atMs}`);
    }
  }

  await adapter.stop();
  console.log('Production TypeScript parity fixture passed: stationary/high cadence reaches active, then grace.');
}

void main();
