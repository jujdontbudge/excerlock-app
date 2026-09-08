import { Rule } from '../types';
import { progressDay, splitAtMidnight } from '../progressDay';

const rule: Rule = {
  id: 'gym',
  activity: 'gym',
  mode: { kind: 'target', activity: 'gym', metric: 'minutes', goal: 30 },
  schedule: { days: [0], window: { kind: 'range', startMinute: 1200, endMinute: 120 } },
  enabled: true,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

test('no row is written for an unscheduled day', () => {
  expect(progressDay(rule, '2026-09-08T16:00:00.000Z', 'America/New_York')).toBeNull();
});

test('a cross-midnight session belongs to the instance start day', () => {
  expect(progressDay(rule, '2026-09-07T04:30:00.000Z', 'America/New_York')).toBe('2026-09-06');
});

test('a rule scheduled today but outside its window still uses today', () => {
  expect(progressDay(rule, '2026-09-06T16:00:00.000Z', 'America/New_York')).toBe('2026-09-06');
});

test('a cross-midnight credit interval is split by calendar day', () => {
  expect(
    splitAtMidnight(
      '2026-09-07T03:50:00.000Z',
      '2026-09-07T04:10:00.000Z',
      'America/New_York',
    ),
  ).toEqual([
    {
      day: '2026-09-06',
      from: '2026-09-07T03:50:00.000Z',
      to: '2026-09-07T04:00:00.000Z',
    },
    {
      day: '2026-09-07',
      from: '2026-09-07T04:00:00.000Z',
      to: '2026-09-07T04:10:00.000Z',
    },
  ]);
});
