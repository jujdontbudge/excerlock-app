import { FakeClock } from '../../../demo/clock';
import { NOW, makeRule } from '../../../demo/scenarios/base';
import { WalkVerifier } from '../../../engine/signals/motion/WalkVerifier';
import { Rule } from '../../../domain/types';
import { ruleDaysStore } from '../../../state/ruleDaysStore';
import { rulesStore } from '../../../state/rulesStore';
import { resetStores } from '../../../state/stores';
import { keepAliveStub } from '../../__tests__/stubs';
import { replayMotion } from '../../__tests__/fixturePlayback';
import type { MotionFixtureName } from '../../../engine/signals/motion/fixtures';
import { WalkingSession } from '../../pending/types';
import { createWalkingAdapter } from '../WalkingAdapter';

/**
 * The adapter against the real engine.
 *
 * Everything else in this directory substitutes the verifier so a test can state a verdict. Here
 * the recordings P2-T03 moved play through the real `WalkVerifier`, which is the only way to know
 * that the events the adapter emits are the ones the sensors actually produce.
 */

const rule: Rule = {
  ...makeRule('walk-state', { kind: 'state', activity: 'walking', place: 'either' }),
  schedule: { days: [0, 1, 2, 3, 4, 5, 6], window: { kind: 'range', startMinute: 660, endMinute: 780 } },
};

let close: (() => void) | undefined;
afterEach(() => {
  close?.();
  close = undefined;
});

async function play(fixture: MotionFixtureName, throughMs: number, stopGraceSeconds = 30) {
  resetStores();
  rulesStore.getState().patch({ rules: [rule] });
  const clock = new FakeClock(NOW, 'America/New_York');
  const origin = Date.parse(NOW);
  const motion = replayMotion(fixture, origin);
  const adapter = createWalkingAdapter({
    clock,
    motion: motion.provider,
    location: keepAliveStub(),
    createVerifier: (options) => new WalkVerifier(options),
    stopGraceSeconds: () => stopGraceSeconds,
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
  await adapter.start(rule);
  // A second of wall clock, then the second of recording that belongs to it. The adapter sees the
  // samples with their own timestamps, exactly as Core Motion delivers them.
  for (let offset = 1000; offset <= throughMs; offset += 1000) {
    clock.set(new Date(origin + offset).toISOString());
    motion.playTo(offset);
  }
  return {
    session: () => session as WalkingSession | null,
    progress: () => ruleDaysStore.getState().data.days.find((day) => day.ruleId === rule.id)?.progress ?? 0,
  };
}

describe('WalkingAdapter over the recorded fixtures', () => {
  test('a steady walk verifies and keeps earning across a gap in the pedometer', async () => {
    const run = await play('steady-walk', 30_000);
    expect(run.session()?.phase).toBe('walking');
    // Cadence goes quiet between four and fifteen seconds. The walk survives it: the stop grace is
    // longer than the gap, so the session is still walking and still being credited at the end.
    expect(run.session()?.endReason).toBeNull();
    expect(run.progress()).toBeGreaterThan(0);
  });

  test('shaking the phone never earns a minute', async () => {
    // Cadence-like spikes at 3.2 steps per second while Core Motion still classifies the user as
    // stationary. This is the cheat the cadence threshold alone would pay for.
    const run = await play('shaky-cheat', 15_000);
    expect(run.session()?.phase).toBe('verifying');
    expect(run.session()?.verifiedAt).toBeNull();
    expect(run.progress()).toBe(0);
  });

  test('a pause longer than the stop grace ends the walk, whatever the activity says', async () => {
    // The recording's cadence stops at four seconds and does not come back until forty-six, even
    // though Core Motion only reports stationary at twenty. The pedometer going quiet is the
    // earlier and the authoritative signal, so a thirty-second grace has expired long before the
    // user starts moving again.
    const run = await play('red-light', 70_000);
    expect(run.session()?.phase).toBe('ended');
    expect(run.session()?.endReason).toBe('graceExpired');
  });

  test('the same pause is survivable on a longer stop grace', async () => {
    // Stop grace is the user's setting, and it is the only grace that governs. At sixty seconds
    // the same recording recovers: the walk resumes before the grace expires and keeps its session.
    const run = await play('red-light', 70_000, 60);
    expect(run.session()?.phase).toBe('walking');
    expect(run.session()?.endedAt).toBeNull();
  });

  test('stopping for good ends the session one stop grace later, not two', async () => {
    const run = await play('stop-for-good', 60_000);
    const session = run.session();
    expect(session?.phase).toBe('ended');
    expect(session?.endReason).toBe('graceExpired');
    // Walking stops ten seconds in and the stop grace is thirty, so the session ends at forty.
    // Letting the verifier's own hysteresis run first would have paid for a further thirty.
    expect(Date.parse(session!.endedAt!) - Date.parse(NOW)).toBeLessThanOrEqual(45_000);
  });

  test('getting into a car disqualifies the walk immediately', async () => {
    const run = await play('drive-off', 45_000);
    expect(run.session()?.phase).not.toBe('walking');
    // Credit stops at the wheel, not thirty seconds down the road.
    expect(run.progress()).toBeLessThan(0.6);
  });
});
