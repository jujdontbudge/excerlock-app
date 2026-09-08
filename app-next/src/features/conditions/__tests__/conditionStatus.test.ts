import { conditionStatus } from '../conditionStatus';
import { Rule, RuleDay } from '../../../domain/types';
const rule: Rule = {
  id: 'r1',
  activity: 'walking',
  mode: { kind: 'target', activity: 'walking', metric: 'steps', goal: 5000, place: 'outside' },
  schedule: { days: [1], window: { kind: 'range', startMinute: 540, endMinute: 1260 } },
  enabled: true,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};
const monday = '2026-09-07T15:00:00.000Z'; // a Monday, 3 PM UTC
const tz = 'UTC';
const day = (over: Partial<RuleDay> = {}): RuleDay => ({
  ruleId: 'r1',
  day: '2026-09-07',
  progress: 0,
  met: false,
  metAt: null,
  ...over,
});
test('a rule paused because its gym is gone says so', () => {
  expect(conditionStatus({ ...rule, enabled: false, pausedReason: 'noGym' }, [], monday, tz)).toMatchObject({
    tone: 'paused',
  });
});
test('a rule the user paused reads paused', () => {
  expect(conditionStatus({ ...rule, enabled: false }, [], monday, tz).tone).toBe('paused');
});
test('a rule met today reads met even when today is no longer one of its days', () => {
  const edited = { ...rule, schedule: { ...rule.schedule, days: [3 as const] } };
  expect(conditionStatus(edited, [day({ met: true, metAt: monday })], monday, tz).tone).toBe('met');
});
test('a rule inside its window reads blocking now', () => {
  expect(conditionStatus(rule, [day()], monday, tz).tone).toBe('active');
});
test('a rule not scheduled today is idle', () => {
  expect(conditionStatus({ ...rule, schedule: { ...rule.schedule, days: [3] } }, [], monday, tz).tone).toBe('idle');
});
