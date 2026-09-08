import { FakeClock } from '../../../demo/clock';
import { NOW, makeRule } from '../../../demo/scenarios/base';
import { Rule, WalkingSession } from '../../../domain/types';
import { ruleDaysStore } from '../../../state/ruleDaysStore';
import { rulesStore } from '../../../state/rulesStore';
import { resetStores } from '../../../state/stores';
import { walkingContract } from '../../../ports/__tests__/walkingContract';
import { keepAliveStub, motionStub, placementStub, verifierStub } from '../../__tests__/stubs';
import { createWalkingAdapter } from '../WalkingAdapter';

/** A thirty-minute window opening at the scenario clock, so teardown is reachable within one lease. */
const WINDOW_MINUTES = 30;

walkingContract('native', () => {
  resetStores();
  const rule: Rule = {
    ...makeRule('walk-state', { kind: 'state', activity: 'walking', place: 'either' }),
    schedule: {
      days: [0, 1, 2, 3, 4, 5, 6],
      window: { kind: 'range', startMinute: 660, endMinute: 660 + WINDOW_MINUTES },
    },
  };
  rulesStore.getState().patch({ rules: [rule] });
  const clock = new FakeClock(NOW, 'America/New_York');
  const motion = motionStub();
  const placement = placementStub();
  const verifier = verifierStub({ gracePeriodMs: 30_000 });
  const port = createWalkingAdapter({
    clock,
    motion: motion.provider,
    location: keepAliveStub(),
    createVerifier: () => verifier,
    createPlacement: () => placement.provider,
    createClassifier: () => placement.classifier,
  });
  let session: WalkingSession | null = null;
  const stop = port.observe((value) => {
    session = value;
  });

  return {
    port,
    rule,
    windowEnd: new Date(Date.parse(NOW) + WINDOW_MINUTES * 60_000).toISOString(),
    now: clock.now,
    advance: clock.advance,
    signal: (type) => {
      if (type === 'tick') return port.tick();
      verifier.verdict = type === 'verified' ? 'verified' : 'notWalking';
      motion.emitCadence({ asOf: Date.parse(clock.now()) });
    },
    session: () => session,
    progress: () => ruleDaysStore.getState().data.days.find((row) => row.ruleId === rule.id)?.progress ?? 0,
    dispose: () => {
      stop();
      port.dispose();
      clock.dispose();
    },
  };
});
