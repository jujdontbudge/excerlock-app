import { dayKey, isActiveAt, nextInstanceStart, windowInstances } from '../schedule';
import { Rule } from '../types';
import { rule } from './fixtures';
test('weekday windows use the supplied timezone, inclusive start and exclusive end', () => {
  expect(dayKey('2026-09-07T02:00:00Z', 'America/New_York')).toBe('2026-09-06');
  expect(windowInstances(rule, '2026-09-07', 'America/New_York')).toEqual([
    { ruleId: 'walk', day: '2026-09-07', start: '2026-09-07T13:00:00.000Z', end: '2026-09-08T01:00:00.000Z' },
  ]);
  expect(windowInstances(rule, '2026-09-06', 'America/New_York')).toEqual([]);
  expect(isActiveAt(rule, '2026-09-07T13:00:00Z', 'America/New_York')).toBe(true);
  expect(isActiveAt(rule, '2026-09-08T01:00:00Z', 'America/New_York')).toBe(false);
  expect(nextInstanceStart([rule], '2026-09-07T13:00:00Z', 'America/New_York')).toBe('2026-09-08T13:00:00.000Z');
});
test('cross-midnight windows belong to their start day and paused rules disappear', () => {
  const cross: Rule = {
    ...rule,
    schedule: { days: [0], window: { kind: 'range', startMinute: 1200, endMinute: 120 } },
  };
  expect(windowInstances(cross, '2026-09-06', 'America/New_York')[0]).toEqual({
    ruleId: 'walk',
    day: '2026-09-06',
    start: '2026-09-07T00:00:00.000Z',
    end: '2026-09-07T06:00:00.000Z',
  });
  expect(isActiveAt(cross, '2026-09-07T05:00:00Z', 'America/New_York')).toBe(true);
  expect(isActiveAt(cross, '2026-09-07T05:00:00Z', 'Asia/Tokyo')).toBe(false);
  expect(windowInstances({ ...cross, enabled: false }, '2026-09-06', 'UTC')).toEqual([]);
  expect(nextInstanceStart([], '2026-09-07T00:00:00Z', 'UTC')).toBeNull();
});
test.each([
  ['2026-03-08', 23],
  ['2026-11-01', 25],
])('all-day %s spans its actual DST day', (day, hours) => {
  const all: Rule = { ...rule, schedule: { days: [0], window: { kind: 'allDay' } } };
  const window = windowInstances(all, day as string, 'America/New_York')[0];
  expect((Date.parse(window.end) - Date.parse(window.start)) / 3600000).toBe(hours);
});
test('nonexistent spring time shifts forward; repeated fall time chooses its first occurrence', () => {
  const gap: Rule = { ...rule, schedule: { days: [0], window: { kind: 'range', startMinute: 150, endMinute: 240 } } };
  expect(windowInstances(gap, '2026-03-08', 'America/New_York')[0].start).toBe('2026-03-08T07:30:00.000Z');
  const fold: Rule = { ...gap, schedule: { days: [0], window: { kind: 'range', startMinute: 90, endMinute: 180 } } };
  expect(windowInstances(fold, '2026-11-01', 'America/New_York')[0].start).toBe('2026-11-01T05:30:00.000Z');
});
