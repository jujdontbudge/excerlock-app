import { progressContent } from '../../features/home/progressContent';
import { scenarios } from '../scenarios';
import { makeRule } from '../scenarios/base';
import { unlockEntries } from '../../features/unlock/entry';
test.each([
  'home-locked-walking',
  'home-walking-session',
  'gym-arrival-user',
  'gym-time-user',
  'runner-distance',
  'biker-time',
  'runner-claim-on-open',
])('%s progress variant', (id) => {
  const s = scenarios.find((s) => s.id === id)!;
  expect(
    progressContent(
      s.rules[0],
      s.ruleDays[0] ?? { ruleId: s.rules[0].id, day: '2026-09-07', progress: 0, met: false, metAt: null },
      s.permissions,
      s.walkingSession ?? null,
      s.clock.now,
      false,
    ),
  ).toMatchSnapshot();
});

test('denied and restricted sensors explain frozen state and event cards with a Fix action', () => {
  const state = makeRule('state', { kind: 'state', activity: 'walking', place: 'outside' });
  const gym = makeRule('gym', { kind: 'event', activity: 'gym', trigger: 'arrival' });
  const empty = (ruleId: string) => ({ ruleId, day: '2026-09-07', progress: 0, met: false, metAt: null });
  const permissions = { ...scenarios[0].permissions, motion: 'denied' as const, location: 'denied' as const };

  expect(progressContent(state, empty(state.id), permissions, null, state.updatedAt, false)).toMatchObject({
    detail: 'Motion & Fitness access needed to update steps',
    action: 'fix',
    label: 'Fix',
  });
  expect(
    progressContent(state, empty(state.id), { ...permissions, motion: 'restricted' }, null, state.updatedAt, false),
  ).toMatchObject({ detail: 'Motion & Fitness access needed to update steps', action: 'fix' });
  expect(progressContent(gym, empty(gym.id), permissions, null, gym.updatedAt, false)).toMatchObject({
    detail: 'Location access needed to recognize your gym',
    action: 'fix',
    label: 'Fix',
  });
});

test('granted permissions preserve the walk action and the gym ceremony pill', () => {
  const state = makeRule('state', { kind: 'state', activity: 'walking', place: 'outside' });
  const gym = makeRule('gym', { kind: 'event', activity: 'gym', trigger: 'arrival' });
  const empty = (ruleId: string) => ({ ruleId, day: '2026-09-07', progress: 0, met: false, metAt: null });
  const permissions = scenarios.find((scenario) => scenario.id === 'home-locked-walking')!.permissions;

  expect(progressContent(state, empty(state.id), permissions, null, state.updatedAt, false)).toMatchObject({
    action: 'walk',
    label: 'Start a walk',
  });
  // The arrival ceremony (P2-T21) replaced the in-place check-in, so the gym card opens it instead.
  const gymModel = progressContent(gym, empty(gym.id), permissions, null, gym.updatedAt, false);
  expect(gymModel).toMatchObject({ detail: 'Your next visit counts · Auto-detect off', label: "I'm at the gym" });
  expect(gymModel.action).toBeUndefined();
});

test('a condition satisfied by another condition has attribution and no action', () => {
  const gym = makeRule('gym', { kind: 'event', activity: 'gym', trigger: 'arrival' });
  const model = progressContent(
    gym,
    { ruleId: gym.id, day: '2026-09-07', progress: 0, met: false, metAt: null },
    scenarios.find((scenario) => scenario.id === 'home-locked-walking')!.permissions,
    null,
    gym.updatedAt,
    false,
    { byRuleId: 'walk', byRuleName: 'Walk 5,000 steps' },
  );

  expect(model).toMatchObject({ detail: 'Satisfied by Walk 5,000 steps today' });
  expect(model.action).toBeUndefined();
  expect(model.label).toBeUndefined();
});

test('a treadmill minutes rule counts walked minutes and offers the treadmill pill', () => {
  const rule = makeRule('walk-minutes', {
    kind: 'target',
    activity: 'walking',
    metric: 'minutes',
    goal: 20,
    place: 'treadmill',
  });
  const model = progressContent(
    rule,
    { ruleId: rule.id, day: '2026-09-07', progress: 0, met: false, metAt: null },
    scenarios.find((scenario) => scenario.id === 'home-locked-walking')!.permissions,
    null,
    rule.updatedAt,
    false,
  );
  expect(model.detail).toBe('0 / 20 min walked');
  expect(unlockEntries(rule)).toEqual(['treadmill']);
});
