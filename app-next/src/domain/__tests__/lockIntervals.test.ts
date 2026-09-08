import { mergedLockIntervals } from '../lockIntervals';
import { Rule } from '../types';
import { rule } from './fixtures';

const scheduled = (id: string, days: Rule['schedule']['days'], startMinute: number, endMinute: number): Rule => ({
  ...rule,
  id,
  schedule: { days, window: { kind: 'range', startMinute, endMinute } },
});

test('overlapping and adjacent windows merge and union their rule ids', () => {
  const overlapping = mergedLockIntervals(
    [scheduled('early', [1], 540, 720), scheduled('late', [1], 600, 840)],
    '2026-09-07',
    1,
    'UTC',
  );
  expect(overlapping).toEqual([
    {
      start: '2026-09-07T09:00:00.000Z',
      end: '2026-09-07T14:00:00.000Z',
      ruleIds: ['early', 'late'],
      timezone: 'UTC',
    },
  ]);

  const adjacent = mergedLockIntervals(
    [scheduled('early', [1], 540, 720), scheduled('late', [1], 720, 900)],
    '2026-09-07',
    1,
    'UTC',
  );
  expect(adjacent).toHaveLength(1);
  expect(adjacent[0]).toMatchObject({
    start: '2026-09-07T09:00:00.000Z',
    end: '2026-09-07T15:00:00.000Z',
  });
});

test('cross-midnight windows merge into the next morning window', () => {
  const intervals = mergedLockIntervals(
    [scheduled('overnight', [1], 1200, 120), scheduled('morning', [2], 60, 180)],
    '2026-09-07',
    2,
    'UTC',
  );
  expect(intervals[0]).toMatchObject({
    start: '2026-09-07T20:00:00.000Z',
    end: '2026-09-08T03:00:00.000Z',
    ruleIds: ['morning', 'overnight'],
  });
});

test('all-day runs swallow other windows and merge across adjacent days', () => {
  const allDay: Rule = {
    ...rule,
    id: 'all-day',
    schedule: { days: [1, 2], window: { kind: 'allDay' } },
  };
  const intervals = mergedLockIntervals([allDay, scheduled('inside', [1], 600, 660)], '2026-09-07', 2, 'UTC');
  expect(intervals).toEqual([
    {
      start: '2026-09-07T00:00:00.000Z',
      end: '2026-09-09T00:00:00.000Z',
      ruleIds: ['all-day', 'inside'],
      timezone: 'UTC',
    },
  ]);
});

test('a DST day uses local midnights and a paused rule contributes no interval', () => {
  const springForward: Rule = {
    ...rule,
    id: 'dst',
    schedule: { days: [0], window: { kind: 'allDay' } },
  };
  const intervals = mergedLockIntervals(
    [springForward, { ...scheduled('paused', [0], 600, 660), enabled: false }],
    '2026-03-08',
    1,
    'America/New_York',
  );
  expect(intervals).toHaveLength(1);
  expect(Date.parse(intervals[0].end) - Date.parse(intervals[0].start)).toBe(23 * 60 * 60 * 1000);
  expect(intervals[0].ruleIds).toEqual(['dst']);
});

test('an invalid horizon produces no intervals', () => {
  expect(mergedLockIntervals([rule], '2026-09-07', 0, 'UTC')).toEqual([]);
  expect(mergedLockIntervals([rule], '2026-09-07', 1.5, 'UTC')).toEqual([]);
});
