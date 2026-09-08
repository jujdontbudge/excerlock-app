import { FakeContext } from '../FakeContext';
import { WalkingFake } from '../fakes/WalkingFake';
import { base, makeRule } from '../scenarios/base';
import { resetStores } from '../../state/stores';
import { rulesStore } from '../../state/rulesStore';
import { ruleDaysStore } from '../../state/ruleDaysStore';
import { Rule } from '../../domain/types';

// A rule that no longer covers now cannot keep booking minutes against itself.
const walkRule: Rule = {
  ...makeRule('walk-state', { kind: 'state', activity: 'walking', place: 'either' }),
  schedule: { days: [0, 1, 2, 3, 4, 5, 6], window: { kind: 'range', startMinute: 660, endMinute: 690 } },
};

let dispose = () => {};
afterEach(() => dispose());

async function live() {
  resetStores();
  const ctx = new FakeContext(base('teardown', 'Teardown', { rules: [walkRule], ruleDays: [] }));
  rulesStore.getState().patch({ rules: [walkRule] });
  const port = WalkingFake(ctx);
  dispose = () => {
    port.disconnect();
    ctx.dispose();
  };
  await port.start(walkRule);
  port.signal('verified');
  return { ctx, port, session: () => ruleDaysStore.getState().data.walkingSession };
}

const progress = () => ruleDaysStore.getState().data.days.find((day) => day.ruleId === walkRule.id)?.progress ?? 0;

test.each([
  ['pausing the rule', () => rulesStore.getState().patch({ rules: [{ ...walkRule, enabled: false }] })],
  ['deleting the rule', () => rulesStore.getState().patch({ rules: [] })],
  [
    'editing the rule out of today',
    () =>
      rulesStore.getState().patch({
        rules: [{ ...walkRule, schedule: { ...walkRule.schedule, days: [6] } }],
      }),
  ],
])('%s ends the walking session with ruleChanged', async (_name, change) => {
  const harness = await live();
  harness.ctx.clock.advance(60_000);
  expect(harness.session()).toMatchObject({ phase: 'walking' });

  change();
  harness.ctx.clock.advance(60_000);

  expect(harness.session()).toMatchObject({ phase: 'ended', endReason: 'ruleChanged' });
});

test('minutes already walked survive the teardown and no more accrue after it', async () => {
  const harness = await live();
  harness.ctx.clock.advance(5 * 60_000);
  expect(progress()).toBe(5);

  rulesStore.getState().patch({ rules: [{ ...walkRule, enabled: false }] });
  harness.ctx.clock.advance(1000);
  const booked = progress();
  expect(harness.session()).toMatchObject({ phase: 'ended', endReason: 'ruleChanged' });
  expect(booked).toBeGreaterThanOrEqual(5);

  harness.ctx.clock.advance(10 * 60_000);
  expect(progress()).toBe(booked);
});
