import { WalkingFake } from '../fakes/WalkingFake';
import { FakeContext } from '../FakeContext';
import { NOW, base, makeRule } from '../scenarios/base';
import { resetStores } from '../../state/stores';
import { rulesStore } from '../../state/rulesStore';
import { ruleDaysStore } from '../../state/ruleDaysStore';
import { walkingContract } from '../../ports/__tests__/walkingContract';
import { Rule } from '../../domain/types';

// A thirty-minute window opening at the scenario clock, so teardown is reachable within one lease.
const WINDOW_MINUTES = 30;

walkingContract('fake', () => {
  resetStores();
  const rule: Rule = {
    ...makeRule('walk-state', { kind: 'state', activity: 'walking', place: 'either' }),
    schedule: {
      days: [0, 1, 2, 3, 4, 5, 6],
      window: { kind: 'range', startMinute: 660, endMinute: 660 + WINDOW_MINUTES },
    },
  };
  const ctx = new FakeContext(base('walking-contract', 'Walking contract', { rules: [rule], ruleDays: [] }));
  rulesStore.getState().patch({ rules: [rule] });
  const port = WalkingFake(ctx);
  return {
    port,
    rule,
    windowEnd: new Date(Date.parse(NOW) + WINDOW_MINUTES * 60_000).toISOString(),
    now: ctx.clock.now,
    advance: ctx.clock.advance,
    signal: port.signal,
    session: () => ruleDaysStore.getState().data.walkingSession,
    progress: () =>
      ruleDaysStore.getState().data.days.find((row) => row.ruleId === rule.id)?.progress ?? 0,
    dispose: () => {
      port.disconnect();
      ctx.dispose();
    },
  };
});
