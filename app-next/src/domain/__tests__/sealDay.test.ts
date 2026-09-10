import { sealDays, retainRuleDays } from '../sealDay';
import type { HistoryArchive } from '../sealDay';
import type { Rule } from '../types';
const rule: Rule = {
  id: 'r',
  activity: 'walking',
  mode: { kind: 'target', activity: 'walking', metric: 'steps', goal: 100 },
  schedule: { days: [0, 1, 2, 3, 4, 5, 6], window: { kind: 'allDay' } },
  enabled: true,
  createdAt: '',
  updatedAt: '',
};
const empty: HistoryArchive = { startedDay: null, days: [] };
const measured = {
  day: '2026-09-08',
  usageMinutes: null,
  activity: { walking: 150, gym: 0 },
  scheduled: true,
  met: true,
};
test('first observation starts accounting, unopened scheduled days seal missed', () => {
  const first = sealDays(empty, [], [rule], 'UTC', '2026-09-08T12:00Z');
  expect(first).toEqual({ startedDay: '2026-09-08', days: [] });
  const next = sealDays(first, [], [rule], 'UTC', '2026-09-11T12:00Z');
  expect(next.days.map((row) => [row.day, row.scheduled, row.met])).toEqual([
    ['2026-09-08', true, false],
    ['2026-09-09', true, false],
    ['2026-09-10', true, false],
  ]);
});
test('seals remain immutable across rule deletion, replay and late history', () => {
  const first = sealDays(empty, [measured], [rule], 'UTC', '2026-09-09T12:00Z');
  const next = sealDays(
    first,
    [{ ...measured, met: false, activity: { walking: 0, gym: 0 } }],
    [],
    'UTC',
    '2026-09-09T13:00Z',
  );
  expect(next).toEqual(first);
});
test('400-calendar-day bound and 35-day accounting retention, no historical resurrection', () => {
  const archive = sealDays({ startedDay: '2000-01-01', days: [] }, [], [rule], 'UTC', '2026-09-10T12:00Z');
  expect(archive.days).toHaveLength(399);
  const row = { ruleId: 'r', day: '2026-09-08', progress: 150, met: true, metAt: null };
  expect(
    retainRuleDays(
      [row],
      [
        { ...row, met: false },
        { ...row, day: '2020-01-01' },
      ],
      archive,
      '2026-09-10',
    ),
  ).toEqual([row]);
});
test.each(['Australia/Adelaide', 'Australia/Lord_Howe'])('DST/travel rollover uses calendar day in %s', (timezone) => {
  const first = sealDays({ startedDay: '2026-10-03', days: [] }, [], [rule], timezone, '2026-10-04T15:00Z');
  expect(first.days.map((row) => row.day)).toEqual(['2026-10-03', '2026-10-04']);
  const rewind = sealDays(first, [], [], timezone, '2026-10-03T12:00Z');
  expect(rewind.days).toEqual(first.days);
});

test('a newly created rule never turns an earlier unopened day into a scheduled miss', () => {
  const next = sealDays({ startedDay: '2026-09-08', days: [] }, [],
    [{ ...rule, createdAt: '2026-09-10T12:00Z' }], 'UTC', '2026-09-10T13:00Z');
  expect(next.days.every(row => !row.scheduled && !row.met)).toBe(true);
});
