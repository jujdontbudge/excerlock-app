import { progressContent } from '../../features/home/progressContent';
import { scenarios } from '../scenarios';
import { makeRule } from '../scenarios/base';
import { unlockEntries } from '../../features/unlock/entry';
import { Rule } from '../../domain/types';
test.each([
  'home-locked-walking',
  'home-walking-session',
  'gym-arrival-user',
  'gym-time-user',
  'runner-distance',
  'biker-time',
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

test('granted permissions preserve walk and check-in actions', () => {
  const state = makeRule('state', { kind: 'state', activity: 'walking', place: 'outside' });
  const gym = makeRule('gym', { kind: 'event', activity: 'gym', trigger: 'arrival' });
  const empty = (ruleId: string) => ({ ruleId, day: '2026-09-07', progress: 0, met: false, metAt: null });
  const permissions = scenarios.find((scenario) => scenario.id === 'home-locked-walking')!.permissions;

  expect(progressContent(state, empty(state.id), permissions, null, state.updatedAt, false)).toMatchObject({
    action: 'walk',
    label: 'Start a walk',
  });
  expect(progressContent(gym, empty(gym.id), permissions, null, gym.updatedAt, false)).toMatchObject({
    detail: 'Your next visit counts · Auto-detect off',
    action: 'checkin',
    label: 'Check in',
  });
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
  // merge: P2-T16 adds walking minutes to RuleMode; until then the shape is built structurally.
  const rule = makeRule('walk-minutes', {
    kind: 'target',
    activity: 'walking',
    metric: 'minutes',
    goal: 20,
    place: 'treadmill',
  } as unknown as Rule['mode']);
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
