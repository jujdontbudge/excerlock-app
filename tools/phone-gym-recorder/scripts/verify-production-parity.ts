/// <reference types="node" />

/**
 * Gym Recorder production parity.
 *
 * Runs the REAL production reducer (`app-next/src/domain/gymMachine.ts`) against
 * the shared fixtures with the same 1 s tick the Swift port uses, and writes one
 * canonical JSON expectation per fixture (`Fixtures/expected-<name>.json`).
 * `ProductionGymDetectorTests.swift` replays the same fixtures through
 * `ProductionGymDetector.swift` and asserts byte-equal JSON, so the two
 * implementations cannot silently drift.
 *
 * The fixtures the design says are copies of the production ones are checked for
 * byte identity here as well, so this script always replays one source.
 */

import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { createGymState, reduceGym } from '../../../app-next/src/domain/gymMachine';
import type { GymDetectionState, GymEvent, GymTransitionRecord } from '../../../app-next/src/domain/gymMachine';
import type { GymInterval } from '../../../app-next/src/domain/gymMachine';

const here = dirname(fileURLToPath(import.meta.url));
const fixturesDirectory = resolve(here, '../Fixtures');
const productionFixturesDirectory = resolve(here, '../../../app-next/src/engine/signals/location/fixtures');

const COPIED_FIXTURES = ['gym-enter-exit.json', 'region-blip.json', 'quiet.json'];
const TICK_MS = 1_000;
/// Long enough for a 30 s confirmation and any coverage due to settle after the
/// last event, so the final derived state is stable in both implementations.
const TAIL_MS = 65_000;

type TimelineEvent = {
  atMs: number;
  event: 'location.enterRegion' | 'location.exitRegion' | 'location.update' | 'location.coverageLost';
  payload: { regionId?: string; lat?: number; lon?: number; accuracy?: number };
};

type Fixture = { name: string; version: number; description: string; timeline: TimelineEvent[] };

type Transition = {
  atMs: number;
  regionId: string;
  transition: 'enter_received' | 'confirm_due' | 'exit_received' | 'coverage_lost';
};

type RegionSnapshot = { pendingEnterAt: number | null; confirmedSince: number | null; lastEventAt: number | null };

type Step = {
  atMs: number;
  trigger: 'tick' | 'enter_region' | 'exit_region' | 'coverage_lost';
  regions: Record<string, RegionSnapshot>;
  intervals: ReturnType<typeof intervalOutput>[];
};

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = canonical((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return value;
}

function deterministicJson(value: unknown): string {
  return JSON.stringify(canonical(value));
}

function regionSnapshots(state: GymDetectionState): Record<string, RegionSnapshot> {
  const snapshot: Record<string, RegionSnapshot> = {};
  for (const [regionId, region] of Object.entries(state.regions)) {
    snapshot[regionId] = {
      pendingEnterAt: region.pendingEnterAt,
      confirmedSince: region.confirmedSince,
      lastEventAt: region.lastEventAt,
    };
  }
  return snapshot;
}

/**
 * One transition per region per step, by state delta. Deliberately identical on
 * both sides: it is a diff of the derived regions, never an inference about
 * which branch of the reducer ran.
 */
function transitionsFor(
  previous: Record<string, RegionSnapshot>,
  next: Record<string, RegionSnapshot>,
  event: GymEvent,
  atMs: number,
): Transition[] {
  const ids = [...new Set([...Object.keys(previous), ...Object.keys(next)])].sort();
  const transitions: Transition[] = [];
  for (const regionId of ids) {
    const before = previous[regionId];
    const after = next[regionId];
    if (!after) continue;
    const hadPresence = (before?.pendingEnterAt ?? null) !== null || (before?.confirmedSince ?? null) !== null;
    const hasPresence = (after.pendingEnterAt ?? null) !== null || (after.confirmedSince ?? null) !== null;
    if (event.kind === 'coverageLost' && hadPresence && !hasPresence) {
      transitions.push({ atMs, regionId, transition: 'coverage_lost' });
      continue;
    }
    if ((before?.confirmedSince ?? null) === null && (after.confirmedSince ?? null) !== null) {
      transitions.push({ atMs, regionId, transition: 'confirm_due' });
      continue;
    }
    if ((before?.pendingEnterAt ?? null) === null && (after.pendingEnterAt ?? null) !== null) {
      transitions.push({ atMs, regionId, transition: 'enter_received' });
      continue;
    }
    // An exit is a transition even when it only cancels a pending confirmation:
    // that cancellation is exactly what the blip and pass-by fixtures prove.
    const hadOpenState = (before?.confirmedSince ?? null) !== null || (before?.pendingEnterAt ?? null) !== null;
    if (hadOpenState && (after.confirmedSince ?? null) === null && (after.pendingEnterAt ?? null) === null) {
      transitions.push({ atMs, regionId, transition: 'exit_received' });
    }
  }
  return transitions;
}

function intervalOutput(interval: GymInterval) {
  return {
    id: interval.id,
    regionId: interval.regionId,
    enteredAt: interval.enteredAt,
    confirmedAt: interval.confirmedAt,
    exitedAt: interval.exitedAt,
  };
}

function replay(fixture: Fixture) {
  const timeline = fixture.timeline;
  const lastAt = timeline.length > 0 ? Math.max(...timeline.map((entry) => entry.atMs)) : 0;
  const records: GymTransitionRecord[] = [];
  let state = createGymState(0);
  const transitions: Transition[] = [];
  const steps: Step[] = [];
  let tickCursor = 0;

  const snapshot = (atMs: number, trigger: Step['trigger']): Step => ({
    atMs,
    trigger,
    regions: regionSnapshots(state),
    intervals: state.intervals.map(intervalOutput),
  });

  const apply = (event: GymEvent, atMs: number, trigger: Step['trigger']) => {
    const previous = regionSnapshots(state);
    // The trajectory is captured after every dispatched step whose derived
    // state changed. It is what makes the coverage-loss quirk visible: a visit
    // closed only by coverage loss is reported at that step and is not retained
    // by later derivations, so the final state alone would hide it.
    const before = deterministicJson({ regions: previous, intervals: state.intervals.map(intervalOutput) });
    state = reduceGym(state, event, atMs);
    transitions.push(...transitionsFor(previous, regionSnapshots(state), event, atMs));
    const after = deterministicJson({ regions: regionSnapshots(state), intervals: state.intervals.map(intervalOutput) });
    if (after !== before) steps.push(snapshot(atMs, trigger));
  };

  const tickTo = (targetMs: number) => {
    while (tickCursor + TICK_MS <= targetMs) {
      tickCursor += TICK_MS;
      apply({ kind: 'tick' }, tickCursor, 'tick');
    }
  };

  for (const entry of timeline) {
    tickTo(entry.atMs);
    const atMs = Math.max(entry.atMs, state.watermark);
    if (entry.event === 'location.enterRegion' || entry.event === 'location.exitRegion') {
      const regionId = entry.payload.regionId;
      assert(regionId, `fixture ${fixture.name}: region event without a regionId at ${entry.atMs}`);
      const type = entry.event === 'location.enterRegion' ? 'enter' : 'exit';
      // Exactly how GeofenceEventProcessor.process builds the production record:
      // delivery time is the only time Core Location gives a region event.
      const record: GymTransitionRecord = { id: `${regionId}:${type}:${entry.atMs}`, regionId, type, atMs: entry.atMs, receivedAtMs: entry.atMs };
      records.push(record);
      apply({ kind: 'records', records: [record] }, atMs, `${type}_region`);
    } else if (entry.event === 'location.coverageLost') {
      apply({ kind: 'coverageLost', regionId: entry.payload.regionId }, atMs, 'coverage_lost');
    } else {
      // location.update only feeds the harness's sampled-distance presence; the
      // production reducer never sees a coordinate. The ticker still advances.
    }
  }
  tickTo(lastAt + TAIL_MS);

  const regions: Record<string, RegionSnapshot> = {};
  for (const regionId of Object.keys(state.regions).sort()) {
    const region = state.regions[regionId];
    regions[regionId] = {
      pendingEnterAt: region.pendingEnterAt,
      confirmedSince: region.confirmedSince,
      lastEventAt: region.lastEventAt,
    };
  }

  return {
    fixture: fixture.name,
    tickMs: TICK_MS,
    tailMs: TAIL_MS,
    watermark: state.watermark,
    recordCount: records.length,
    regions,
    intervals: state.intervals.map(intervalOutput),
    transitions,
    steps,
  };
}

function readFixture(name: string): Fixture {
  return JSON.parse(readFileSync(resolve(fixturesDirectory, name), 'utf8')) as Fixture;
}

function main(): void {
  for (const name of COPIED_FIXTURES) {
    const expected = resolve(productionFixturesDirectory, name);
    assert(existsSync(expected), `production fixture ${name} is missing`);
    assert.equal(
      readFileSync(resolve(fixturesDirectory, name), 'utf8'),
      readFileSync(expected, 'utf8'),
      `${name} must stay byte-identical to ${expected}`,
    );
  }

  const names = ['gym-enter-exit', 'region-blip', 'quiet', 'gym-oscillation', 'gym-passby', 'gym-coverage-lost'];
  const results = new Map<string, ReturnType<typeof replay>>();
  for (const name of names) {
    const fixture = readFixture(`${name}.json`);
    const result = replay(fixture);
    results.set(name, result);
    writeFileSync(resolve(fixturesDirectory, `expected-${name}.json`), `${deterministicJson(result)}\n`);
  }

  // The invariants the design states for the shipped fixtures. If a fixture
  // ever stops exercising its edge case this fails here, not silently in a
  // device capture.
  const enterExit = results.get('gym-enter-exit')!;
  assert.deepEqual(
    enterExit.intervals.map((interval) => interval.confirmedAt),
    [31_000],
    'gym-enter-exit must confirm exactly 30 s after the enter receipt',
  );
  assert.deepEqual(
    enterExit.intervals.map((interval) => interval.exitedAt),
    [60_000],
    'gym-enter-exit interval must end at the exit receipt',
  );

  const blip = results.get('region-blip')!;
  assert.deepEqual(blip.intervals, [], 'a 4 s blip must never confirm');
  assert.deepEqual(blip.transitions.map((entry) => entry.transition), ['enter_received', 'exit_received']);
  const quiet = results.get('quiet')!;
  assert.deepEqual(quiet.intervals, [], 'quiet has no intervals');
  assert.deepEqual(quiet.regions, {}, 'quiet has no regions');

  const oscillation = results.get('gym-oscillation')!;
  assert.deepEqual(
    oscillation.transitions.map((entry) => entry.transition),
    [
      'enter_received', 'confirm_due', 'exit_received',
      'enter_received', 'confirm_due', 'exit_received',
      'enter_received', 'confirm_due', 'exit_received',
    ],
    'oscillation: every exit must end the visit it confirmed, and a fresh enter must start a fresh confirmation',
  );
  assert.equal(oscillation.intervals.length, 3, 'one interval per crossing pair');
  assert.deepEqual(
    oscillation.intervals.map((interval) => interval.exitedAt),
    [70_000, 190_000, 310_000],
    'every interval must end on its own exit receipt',
  );

  const passby = results.get('gym-passby')!;
  assert.deepEqual(passby.intervals, [], 'a 25 s pass-by must never open an interval');
  assert.deepEqual(passby.transitions.map((entry) => entry.transition), ['enter_received', 'exit_received']);

  const coverage = results.get('gym-coverage-lost')!;
  // The visit exists in the trajectory of the coverage-lost step at exactly the
  // reducer's own rule: exitedAt = max(confirmedAt, lostAt). The production
  // reducer does not retain a coverage-closed visit in later derivations, which
  // is itself a result the port must reproduce byte for byte.
  const coverageStep = coverage.steps.find((step) => step.trigger === 'coverage_lost');
  assert(coverageStep, 'coverageLost must produce a derived step');
  assert.equal(coverageStep.intervals.length, 1, 'coverageLost must keep the visit it closes at that step');
  assert.equal(coverageStep.intervals[0].confirmedAt, 30_000);
  assert.equal(coverageStep.intervals[0].exitedAt, 60_000, 'coverageLost must close at max(confirmedAt, lostAt)');
  assert.deepEqual(
    coverageStep.regions['gym-primary'],
    { pendingEnterAt: null, confirmedSince: null, lastEventAt: 0 },
    'coverageLost must clear the open presence',
  );
  assert.deepEqual(
    coverage.intervals,
    [],
    'the production reducer drops a coverage-closed visit from later derivations; the port must match that too',
  );

  const twoVisits = replay({
    name: 'enter-exit-enter',
    version: 1,
    description: 'inline synthetic: two visits must be two intervals',
    timeline: [
      { atMs: 0, event: 'location.enterRegion', payload: { regionId: 'gym-primary' } },
      { atMs: 60_000, event: 'location.exitRegion', payload: { regionId: 'gym-primary' } },
      { atMs: 120_000, event: 'location.enterRegion', payload: { regionId: 'gym-primary' } },
    ],
  });
  assert.deepEqual(
    twoVisits.intervals.map((interval) => interval.confirmedAt),
    [30_000, 150_000],
    'enter-exit-enter must yield two intervals with fresh confirmations',
  );

  console.log(`Production gym parity fixtures written: ${names.join(', ')}`);
  console.log('Invariants held: blip never confirms, oscillation resets pending, pass-by never confirms,');
  console.log('enter-exit-enter yields two intervals, coverageLost closes at max(confirmedAt, lostAt).');
}

main();
