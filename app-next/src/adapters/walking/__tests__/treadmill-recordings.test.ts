import { FakeClock } from '../../../demo/clock';
import { NOW, makeRule } from '../../../demo/scenarios/base';
import { PhonePlacementClassifier } from '../../../engine/signals/placement/PhonePlacementClassifier';
import { FixturePhonePlacementProvider } from '../../../engine/signals/placement/FixturePhonePlacementProvider';
import recordings from '../../../engine/signals/placement/__tests__/fixtures/treadmillRecordings.json';
import { Rule, WalkingSession } from '../../../domain/types';
import { rulesStore } from '../../../state/rulesStore';
import { resetStores } from '../../../state/stores';
import { keepAliveStub, motionStub, verifierStub } from '../../__tests__/stubs';
import { createWalkingAdapter } from '../WalkingAdapter';

/**
 * The propped session against the device-motion recorded on a real treadmill (#128).
 *
 * The handoff machine is this task's own design, so the only honest way to know a belt jolt does
 * not read as a pickup is to play the belt back through the real `PhonePlacementClassifier`.
 */

type Sample = { timestampMs: number; gravity: { x: number; y: number; z: number }; rotationRate: { x: number; y: number; z: number } };

const rule: Rule = {
  ...makeRule('walk-state', { kind: 'state', activity: 'walking', place: 'either' }),
  schedule: { days: [0, 1, 2, 3, 4, 5, 6], window: { kind: 'range', startMinute: 660, endMinute: 780 } },
};

/** Plays `first`, then `second` continuing from where it left off, as one recording. */
function splice(first: Sample[], second: Sample[]): Sample[] {
  const offset = first[first.length - 1]!.timestampMs + 100;
  return [...first, ...second.map((sample) => ({ ...sample, timestampMs: sample.timestampMs + offset }))];
}

let close: (() => void) | undefined;
afterEach(() => {
  close?.();
  close = undefined;
});

async function proppedSession(samples: Sample[]) {
  resetStores();
  rulesStore.getState().patch({ rules: [rule] });
  const clock = new FakeClock(NOW, 'America/New_York');
  const origin = Date.parse(NOW);
  const motion = motionStub();
  const verifier = verifierStub({ gracePeriodMs: 30_000 });
  // Device motion is recorded in relative milliseconds; the adapter reads instants.
  const shifted = samples.map((sample) => ({ ...sample, timestampMs: sample.timestampMs + origin }));
  const placement = new FixturePhonePlacementProvider(shifted);
  const adapter = createWalkingAdapter({
    clock,
    motion: motion.provider,
    location: keepAliveStub(),
    createVerifier: () => verifier,
    createPlacement: () => placement,
    createClassifier: () => new PhonePlacementClassifier(),
  });
  let session: WalkingSession | null = null;
  const stop = adapter.observe((value) => {
    session = value;
  });
  close = () => {
    stop();
    adapter.dispose();
    clock.dispose();
  };
  await adapter.start(rule, { placement: 'propped' });
  // The camera scan is the propped session's only verification.
  verifier.verdict = 'verified';
  adapter.completeProppedScan();
  const play = (throughMs: number) => {
    placement.advanceTo(origin + throughMs);
    clock.set(new Date(origin + throughMs).toISOString());
  };
  return { adapter, play, verifier, session: () => session as WalkingSession | null };
}

describe('propped walking on the recorded treadmill', () => {
  test('a running belt does not shake the phone out of its verification', async () => {
    const run = await proppedSession(recordings.proppedOnRunningBelt as Sample[]);
    expect(run.session()?.phase).toBe('walking');
    run.play(6_500);
    // Six and a half seconds of belt jolts. The classifier reports no transition, so the handoff
    // machine never opens probation and the session is still walking.
    expect(run.session()?.phase).toBe('walking');
    expect(run.session()?.endedAt).toBeNull();
  });

  test('a pickup that keeps walking keeps the session', async () => {
    const run = await proppedSession(
      splice(recordings.proppedOnQuietConsole as Sample[], recordings.inHandWalking as Sample[]),
    );
    // The recording's pickup lands at 14.5 seconds. The pedometer takes over and qualifies, which
    // is what probation is waiting for, so the walk continues without a break.
    run.play(20_000);
    expect(run.session()?.phase).toBe('walking');
  });

  test('a pickup that stops walking waits out probation before it counts as stopped', async () => {
    const run = await proppedSession(
      splice(recordings.proppedOnQuietConsole as Sample[], recordings.inHandWalking as Sample[]),
    );
    // The user lifts the phone and steps off the belt, so no cadence ever qualifies.
    run.verifier.verdict = 'notWalking';
    run.play(20_000);
    // Still walking five seconds after the pickup: cadence is allowed to be late.
    expect(run.session()?.phase).toBe('walking');
    run.play(36_000);
    // Twenty seconds of probation expired with nothing to show, so the stop grace has started.
    expect(run.session()?.phase).toBe('grace');
  });
});
