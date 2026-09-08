import { FakeContext } from '../FakeContext';
import { WalkingFake } from '../fakes/WalkingFake';
import { base, makeRule } from '../scenarios/base';
import { activityHistory } from '../activityHistory';
import { resetStores } from '../../state/stores';
import { rulesStore } from '../../state/rulesStore';
import { historyStore } from '../../state/historyStore';
import { Rule } from '../../domain/types';
import { ruleDaysStore } from '../../state/ruleDaysStore';
import { scenarios } from '../scenarios';

// `HistoryDay.activity.walking` is a step count, rendered as steps and owned by the pedometer.
// A walking session books minutes, so it must not add them to that field.
const walkRule: Rule = {
  ...makeRule('walk-state', { kind: 'state', activity: 'walking', place: 'either' }),
  schedule: { days: [0, 1, 2, 3, 4, 5, 6], window: { kind: 'range', startMinute: 660, endMinute: 690 } },
};

test('a walking session books minutes without disturbing the day step count', async () => {
  resetStores();
  const scenario = base('walking-units', 'Walking units', { rules: [walkRule], ruleDays: [] });
  const ctx = new FakeContext(scenario);
  rulesStore.getState().patch({ rules: [walkRule] });
  ctx.update({ loading: false, hydrated: true });
  const history = activityHistory(ctx);
  history.refresh();
  const port = WalkingFake(ctx);
  const walkingOnDay = () =>
    historyStore.getState().data.days.find((row) => row.day === '2026-09-07')?.activity.walking;
  const before = walkingOnDay();
  expect(before).toBe(scenario.steps.today);

  await port.start(walkRule);
  port.signal('verified');
  ctx.clock.advance(10 * 60_000);

  expect(walkingOnDay()).toBe(before);

  port.disconnect();
  history.dispose();
  ctx.dispose();
});

test('the last minutes before a day rollover do not land in the previous day step count', async () => {
  resetStores();
  const scenario = scenarios.find((s) => s.id === 'day-rollover-mid-walk')!;
  const ctx = new FakeContext(scenario);
  rulesStore.getState().patch({ rules: scenario.rules });
  ruleDaysStore.getState().patch({ walkingSession: scenario.walkingSession ?? null });
  ctx.update({ loading: false, hydrated: true });
  const history = activityHistory(ctx);
  history.refresh();
  const port = WalkingFake(ctx);
  const walkingOnDay = (day: string) =>
    historyStore.getState().data.days.find((row) => row.day === day)?.activity.walking;
  const before = walkingOnDay('2026-09-07');

  port.resume();
  ctx.clock.advance(5 * 60_000); // 23:59 local through midnight

  expect(ruleDaysStore.getState().data.walkingSession).toMatchObject({ endReason: 'dayRollover' });
  expect(walkingOnDay('2026-09-07')).toBe(before);

  port.disconnect();
  history.dispose();
  ctx.dispose();
});
