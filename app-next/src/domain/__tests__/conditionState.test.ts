import { conditionState } from '../conditionState';
import { rule } from './fixtures';

const now = '2026-09-07T15:00:00.000Z';
const row = { ruleId: rule.id, day: '2026-09-07', progress: 3200, met: false, metAt: null };

test('conditionState returns met for the rule whose row met today and satisfiedToday for other rules', () => {
  const metRow = { ...row, met: true, metAt: now };
  const decision = { state: 'unlockedMet', byRuleId: rule.id, byName: 'Walk', metAt: now, relockAt: null } as const;
  expect(conditionState(rule, metRow, decision, now, 'America/New_York')).toBe('met');
  expect(conditionState({ ...rule, id: 'evening' }, { ...row, ruleId: 'evening' }, decision, now, 'America/New_York')).toBe(
    'satisfiedToday',
  );
});

test('conditionState distinguishes blocking, walking live, and scheduled progress', () => {
  expect(
    conditionState(
      rule,
      row,
      { state: 'locked', activeRuleIds: [rule.id], nextUnlockHint: { ruleId: rule.id, action: 'walk', remaining: 1800, goal: 5000, unit: 'steps' } },
      now,
      'America/New_York',
    ),
  ).toBe('blockingNow');
  expect(
    conditionState(
      { ...rule, mode: { kind: 'state', activity: 'walking', place: 'outside' } },
      row,
      { state: 'unlockedWalking', sessionRuleId: rule.id, leaseUntil: '2026-09-07T15:15:00.000Z' },
      now,
      'America/New_York',
    ),
  ).toBe('live');
  expect(
    conditionState(
      rule,
      row,
      { state: 'beforeWindow', nextLockAt: '2026-09-07T16:00:00.000Z', ruleId: rule.id, getAheadRuleId: null },
      now,
      'America/New_York',
    ),
  ).toBe('inProgress');
});

test('conditionState distinguishes paused reasons, denied sensors, and unscheduled days', () => {
  expect(conditionState({ ...rule, enabled: false }, row, { state: 'noRulesToday', nextLockAt: null }, now, 'America/New_York')).toBe(
    'paused',
  );
  expect(
    conditionState(
      { ...rule, activity: 'gym', mode: { kind: 'event', activity: 'gym', trigger: 'arrival' }, enabled: false, pausedReason: 'noGym' },
      row,
      { state: 'noRulesToday', nextLockAt: null },
      now,
      'America/New_York',
    ),
  ).toBe('pausedNoGym');
  expect(
    conditionState(
      { ...rule, permissionNeeded: true },
      row,
      { state: 'locked', activeRuleIds: [rule.id], nextUnlockHint: { ruleId: rule.id, action: 'walk', remaining: 1800, goal: 5000, unit: 'steps' } },
      now,
      'America/New_York',
    ),
  ).toBe('permissionNeeded');
  expect(
    conditionState(
      { ...rule, schedule: { ...rule.schedule, days: [1] } },
      { ...row, day: '2026-09-06' },
      { state: 'noRulesToday', nextLockAt: null },
      '2026-09-06T15:00:00.000Z',
      'America/New_York',
    ),
  ).toBe('notScheduled');
});
