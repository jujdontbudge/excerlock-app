import { WalkingFake } from '../fakes/WalkingFake';
import { FakeContext } from '../FakeContext';
import { base, makeRule } from '../scenarios/base';
import { resetStores } from '../../state/stores';
import { rulesStore } from '../../state/rulesStore';
import { ruleDaysStore } from '../../state/ruleDaysStore';
import { walkingContract } from '../../ports/__tests__/walkingContract';

walkingContract('fake', () => {
  resetStores();
  const rule = makeRule('walk-state', { kind: 'state', activity: 'walking', place: 'either' });
  const ctx = new FakeContext(base('walking-contract', 'Walking contract', { rules: [rule], ruleDays: [] }));
  rulesStore.getState().patch({ rules: [rule] });
  const port = WalkingFake(ctx);
  return {
    port,
    rule,
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
