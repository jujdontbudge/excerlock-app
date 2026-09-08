import { unlockHint } from '../unlockHint';
import { rule } from './fixtures';
import { Rule } from '../types';
const state: Rule = { ...rule, id: 'state', mode: { kind: 'state', activity: 'walking', place: 'outside' } };
const gym: Rule = { ...rule, id: 'gym', activity: 'gym', mode: { kind: 'event', activity: 'gym', trigger: 'arrival' } };
test('immediate actions rank first; numeric remainders compare only matching units', () => {
  expect(unlockHint([rule, state], [])).toEqual({ ruleId: 'state', action: 'walk', remaining: null, unit: null });
  expect(unlockHint([rule, gym], [])).toEqual({ ruleId: 'gym', action: 'arrive', remaining: null, unit: null });
  const smaller: Rule = {
    ...rule,
    id: 'small',
    mode: { kind: 'target', activity: 'walking', metric: 'steps', goal: 1000, place: 'either' },
  };
  expect(unlockHint([rule, smaller], []).ruleId).toBe('small');
  expect(
    unlockHint([rule, smaller], [{ ruleId: 'walk', day: '2026-09-07', progress: 4500, met: false, metAt: null }])
      .ruleId,
  ).toBe('walk');
  const run: Rule = {
    ...rule,
    id: 'run',
    activity: 'running',
    mode: { kind: 'target', activity: 'running', metric: 'distance', goal: 2, unit: 'mi' },
  };
  expect(unlockHint([rule, run], []).ruleId).toBe('walk');
  expect(unlockHint([run], []).unit).toBe('mi');
  expect(() => unlockHint([], [])).toThrow('No active rules');
});
test('the first immediate offer stays ahead of subsequent offers', () => {
  expect(unlockHint([state, gym, rule], []).ruleId).toBe('state');
});
test('a walking duration rule reports its remaining minutes', () => {
  const duration = {
    ...rule,
    id: 'duration',
    mode: { kind: 'target' as const, activity: 'walking' as const, metric: 'minutes' as const, goal: 20, place: 'treadmill' as const },
  };
  expect(unlockHint([duration], [{ ruleId: 'duration', day: '2026-09-07', progress: 12, met: false, metAt: null }])).toEqual(
    { ruleId: 'duration', action: 'progress', remaining: 8, unit: 'minutes' },
  );
});
