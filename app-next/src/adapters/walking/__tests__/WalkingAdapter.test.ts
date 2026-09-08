import { FakeClock } from '../../../demo/clock';
import { NOW, makeRule } from '../../../demo/scenarios/base';
import { Rule } from '../../../domain/types';
import { ruleDaysStore } from '../../../state/ruleDaysStore';
import { rulesStore } from '../../../state/rulesStore';
import { resetStores } from '../../../state/stores';
import { keepAliveStub, motionStub, placementStub, verifierStub } from '../../__tests__/stubs';
import { WalkingSession } from '../../pending/types';
import { createWalkingAdapter } from '../WalkingAdapter';

const stateRule: Rule = {
  ...makeRule('walk-state', { kind: 'state', activity: 'walking', place: 'either' }),
  schedule: { days: [0, 1, 2, 3, 4, 5, 6], window: { kind: 'range', startMinute: 660, endMinute: 780 } },
};

let open: (() => void) | undefined;
// Disposal has to survive a failing expectation: a live FakeClock keeps a real interval running
// and jest will not exit while it does.
afterEach(() => {
  open?.();
  open = undefined;
});

function harness(rule: Rule = stateRule) {
  resetStores();
  rulesStore.getState().patch({ rules: [rule] });
  const clock = new FakeClock(NOW, 'America/New_York');
  const motion = motionStub();
  const placement = placementStub();
  const keepAlive = keepAliveStub();
  const verifier = verifierStub({ gracePeriodMs: 30_000 });
  const adapter = createWalkingAdapter({
    clock,
    motion: motion.provider,
    location: keepAlive,
    createVerifier: () => verifier,
    createPlacement: () => placement.provider,
    createClassifier: () => placement.classifier,
  });
  let session: WalkingSession | null = null;
  const stop = adapter.observe((value) => {
    session = value;
  });
  const cadence = (verdict: 'verified' | 'notWalking', cumulativeSteps = 0) => {
    verifier.verdict = verdict;
    motion.emitCadence({ asOf: Date.parse(clock.now()), cumulativeSteps });
  };
  const dispose = () => {
    stop();
    adapter.dispose();
    clock.dispose();
  };
  open = dispose;
  return {
    adapter,
    clock,
    motion,
    placement,
    keepAlive,
    cadence,
    rule,
    session: () => session,
    progress: () => ruleDaysStore.getState().data.days.find((row) => row.ruleId === rule.id)?.progress ?? 0,
    dispose,
  };
}

describe('WalkingAdapter', () => {
  test('a rule that is not an enabled walking state rule is refused', async () => {
    const h = harness(makeRule('steps-rule'));
    await expect(h.adapter.start(h.rule)).rejects.toMatchObject({ code: 'invalidRule' });
  });

  test('the walk keep-alive and the pedometer run for the life of the session', async () => {
    const h = harness();
    await h.adapter.start(h.rule);
    expect(h.keepAlive.active()).toBe(true);
    expect(h.motion.running()).toBe(true);
    h.adapter.stop();
    await Promise.resolve();
    expect(h.keepAlive.active()).toBe(false);
    expect(h.motion.running()).toBe(false);
  });

  test('a rattling treadmill console never verifies a propped session', async () => {
    const h = harness();
    await h.adapter.start(h.rule, { placement: 'propped' });
    // Core Motion reports a walking cadence for the machine. Until the camera scan lands, it means
    // nothing: the session is still verifying and nothing is credited.
    h.cadence('verified');
    h.clock.advance(5 * 60_000);
    expect(h.session()?.phase).toBe('verifying');
    expect(h.progress()).toBe(0);
  });

  test('a scan credits minutes and the lease is the propped session only bound', async () => {
    const h = harness();
    await h.adapter.start(h.rule, { placement: 'propped' });
    expect(h.adapter.completeProppedScan()).toBe(true);
    h.clock.advance(14 * 60_000);
    expect(h.progress()).toBe(14);
    expect(h.session()?.phase).toBe('walking');

    h.clock.advance(2 * 60_000);
    expect(h.session()).toMatchObject({ phase: 'ended', endReason: 'leaseLapsed' });
    // Credit stops at the lease, not at the tick that noticed it had lapsed.
    expect(h.progress()).toBe(15);
  });

  test('picking the phone up and not walking drops into the stop grace', async () => {
    const h = harness();
    await h.adapter.start(h.rule, { placement: 'propped' });
    h.adapter.completeProppedScan();
    h.clock.advance(60_000);
    h.placement.pickUp(Date.parse(h.clock.now()));
    expect(h.session()?.phase).toBe('walking');

    h.clock.advance(21_000);
    expect(h.session()?.phase).toBe('grace');
  });

  test('setting the phone down keeps the session walking and reopens the scan', async () => {
    const h = harness();
    await h.adapter.start(h.rule, { placement: 'propped' });
    h.adapter.completeProppedScan();
    h.clock.advance(30_000);
    h.placement.pickUp(Date.parse(h.clock.now()));
    h.cadence('verified');
    h.clock.advance(30_000);
    h.placement.setDown(Date.parse(h.clock.now()));

    // Re-seating the phone is not evidence of stopping; minutes keep accruing under the lease.
    expect(h.session()?.phase).toBe('walking');
    expect(h.adapter.treadmillFraming().placement).toBe('propped');

    h.clock.advance(61_000);
    expect(h.session()?.phase).toBe('walking');
    expect(h.adapter.treadmillFraming()).toMatchObject({ ready: true });
  });

  test('a rule paused mid-walk tears the session down', async () => {
    const h = harness();
    await h.adapter.start(h.rule);
    h.cadence('verified');
    h.clock.advance(60_000);
    rulesStore.getState().patch({ rules: [{ ...h.rule, enabled: false }] });

    h.clock.advance(1_000);
    expect(h.session()).toMatchObject({ phase: 'ended', endReason: 'ruleChanged' });
  });

  test('details reports the steps and seconds of this walk', async () => {
    const h = harness();
    await h.adapter.start(h.rule);
    h.cadence('verified', 100);
    h.clock.advance(2 * 60_000);
    h.cadence('verified', 340);
    expect(h.adapter.details()).toMatchObject({ steps: 240, walkingSeconds: 120, graceUntil: null });
  });

  test('a session that survived a relaunch reconnects and credits the same minutes', async () => {
    const h = harness();
    const started = await h.adapter.start(h.rule);
    h.cadence('verified');
    h.clock.advance(5 * 60_000);
    expect(h.progress()).toBe(5);

    // The relaunch: the first adapter is gone, and a fresh one picks the session up from the store.
    h.adapter.dispose();
    const revived = createWalkingAdapter({
      clock: h.clock,
      motion: h.motion.provider,
      location: h.keepAlive,
      createVerifier: () => verifierStub({ gracePeriodMs: 30_000 }),
    });
    revived.resume();
    expect(h.progress()).toBe(5);

    h.clock.advance(60_000);
    expect(h.progress()).toBe(6);
    expect(ruleDaysStore.getState().data.walkingSession?.ruleId).toBe(started.ruleId);
    revived.dispose();
  });
});
