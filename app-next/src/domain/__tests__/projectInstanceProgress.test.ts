import { planStepInstanceMeasurements, projectInstanceProgress, walkingAccountingDeadlines } from '../projectInstanceProgress';
import { progressDay } from '../progressDay';
import { sealDays } from '../sealDay';
import { projectMeasuredHistory } from '../projectMeasuredHistory';
import type { Rule } from '../types';
const ms = (s: string) => Date.parse(s);
const now = '2026-09-08T00:30:00Z';
const rule: Rule = {
  id: 'r',
  activity: 'walking',
  mode: { kind: 'target', activity: 'walking', metric: 'steps', goal: 5000 },
  schedule: { days: [1], window: { kind: 'range', startMinute: 1200, endMinute: 120 } },
  enabled: true,
  createdAt: '2026-09-01T00:00Z',
  updatedAt: '',
};
const minuteRule: Rule = { ...rule, mode: { kind: 'target', activity: 'walking', metric: 'minutes', goal: 30 } };
const segment = (from: string, to: string) => ({ from: ms(from), to: ms(to), day: from.slice(0, 10), timezone: 'UTC' });

test.each([[[1]], [[1, 2]]])('overnight steps use the instance day with schedule %j', (days) => {
  const r = { ...rule, schedule: { ...rule.schedule, days: days as (0 | 1 | 2 | 3 | 4 | 5 | 6)[] } };
  const ranges = planStepInstanceMeasurements([r], now, 'UTC');
  const samples = Object.fromEntries(
    ranges.map((range) => [
      range.key,
      {
        from: range.from,
        through: range.to,
        steps: range.from === ms('2026-09-07T00:00Z') ? 5500 : 1500,
        timezone: 'UTC',
      },
    ]),
  );
  const rows = projectInstanceProgress([r], [], samples, [], [], [], 'UTC', now);
  expect(rows.find((row) => row.day === '2026-09-07')).toMatchObject({ progress: 5500, met: true });
  if (days.length === 2)
    expect(rows.find((row) => row.day === '2026-09-08')).toMatchObject({ progress: 1500, met: false });
  const history = projectMeasuredHistory({ '2026-09-07': 4000, '2026-09-08': 1500 }, [], [], [r], rows, 'UTC', now);
  expect(history.map((day) => day.activity.walking)).toEqual([4000, 1500]);
});

test('walking minutes clip exact timestamps, overlap safely, and replay idempotently', () => {
  const walking = [
    segment('2026-09-07T10:00Z', '2026-09-07T10:29Z'),
    segment('2026-09-08T00:00Z', '2026-09-08T00:02Z'),
  ];
  const rows = projectInstanceProgress([minuteRule], [], {}, walking, [], [], 'UTC', now);
  expect(rows[0]).toMatchObject({ day: '2026-09-07', progress: 31, met: true, metAt: '2026-09-08T00:01:00.000Z' });
  expect(projectInstanceProgress([minuteRule], rows, {}, [...walking, ...walking], [], [], 'UTC', now)).toEqual(rows);
});

test('late wake requests exact window end, not a scalar proportion of the next day', () => {
  const ranges = planStepInstanceMeasurements([rule], '2026-09-08T03:00Z', 'UTC');
  expect(ranges).toHaveLength(1);
  expect(ranges[0]).toMatchObject({ from: ms('2026-09-07T00:00Z'), to: ms('2026-09-08T02:00Z') });
  const future = { from: ranges[0].from, through: ms('2026-09-08T03:00Z'), steps: 9000, timezone: 'UTC' };
  expect(
    projectInstanceProgress([rule], [], { [ranges[0].key]: future }, [], [], [], 'UTC', '2026-09-08T03:00Z'),
  ).toEqual([]);
});

test('legacy aggregate-only records do not invent new timestamp ownership; earned rows survive', () => {
  expect(projectInstanceProgress([rule], [], {}, [], [], [], 'UTC', now)).toEqual([]);
  const old = { ruleId: 'r', day: '2026-09-07', progress: 5000, met: true, metAt: '2026-09-07T20:00Z' };
  expect(projectInstanceProgress([rule], [old], {}, [], [], [], 'UTC', now)).toEqual([old]);
});

test('overnight gym event and dwell use confirmed intervals, not calendar scalars', () => {
  const gymRule: Rule = {
    ...rule,
    activity: 'gym',
    mode: { kind: 'target', activity: 'gym', metric: 'minutes', goal: 30 },
  };
  const visits = [
    {
      id: 'v',
      regionId: 'g',
      enteredAt: ms('2026-09-07T23:49:30Z'),
      confirmedAt: ms('2026-09-07T23:50Z'),
      exitedAt: ms('2026-09-08T00:25Z'),
    },
  ];
  expect(projectInstanceProgress([gymRule], [], {}, [], visits, ['g'], 'UTC', now)[0]).toMatchObject({
    day: '2026-09-07',
    progress: 35,
    metAt: '2026-09-08T00:20:00.000Z',
  });
});

test('event progress day chooses containing overnight instance and no unscheduled fallback', () => {
  expect(progressDay(rule, now, 'UTC')).toBe('2026-09-07');
  expect(progressDay(rule, '2026-09-08T03:00Z', 'UTC')).toBeNull();
  expect(progressDay(rule, '2026-09-07T08:00Z', 'UTC')).toBe('2026-09-07');
});

test('history waits for overnight accounting closure before immutable sealing', () => {
  const state = { startedDay: '2026-09-07', days: [] };
  expect(sealDays(state, [], [rule], 'UTC', now).days).toEqual([]);
  expect(sealDays(state, [], [rule], 'UTC', '2026-09-08T02:00Z').days).toHaveLength(1);
});

test.each([
  ['Australia/Adelaide', '2026-10-02T14:30:00Z', '2026-10-03T17:30:00Z'],
  ['Australia/Lord_Howe', '2026-10-02T13:30:00Z', '2026-10-03T17:00:00Z'],
])('DST overnight accounting uses real instants in %s', (timezone, from, to) => {
  const saturday: Rule = {
    ...rule,
    schedule: { days: [6], window: { kind: 'range', startMinute: 1200, endMinute: 240 } },
  };
  const range = planStepInstanceMeasurements([saturday], '2026-10-03T20:00Z', timezone)[0];
  expect(range).toMatchObject({ from: ms(from), to: ms(to) });
});

test('walking session day does not move when the device timezone changes before projection', () => {
  const thursday: Rule = { ...minuteRule, schedule: { days: [4], window: { kind: 'allDay' } } };
  const walking = [
    { from: ms('2026-09-11T04:58Z'), to: ms('2026-09-11T05:00Z'), day: '2026-09-10', timezone: 'America/Chicago' },
  ];
  const before = projectInstanceProgress([thursday], [], {}, walking, [], [], 'America/Chicago', '2026-09-11T05:05Z');
  const after = projectInstanceProgress([thursday], [], {}, walking, [], [], 'America/New_York', '2026-09-11T05:05Z');
  expect(after).toEqual(before);
  expect(after).toEqual([expect.objectContaining({ day: '2026-09-10', progress: 2 })]);
});

test('eastward travel cannot seal an ongoing source-zone overnight window early',()=>{
  const r:Rule={...minuteRule,schedule:{...minuteRule.schedule,days:[4]}};
  const source=[{from:ms('2026-09-11T05:59Z'),to:ms('2026-09-11T06:00Z'),day:'2026-09-11',timezone:'America/Chicago'}];
  const at='2026-09-11T06:30Z';
  const deadlines=walkingAccountingDeadlines([r],source,at,'America/Chicago');
  expect(deadlines['2026-09-10']).toBe(ms('2026-09-11T07:00Z'));
  const archive={startedDay:'2026-09-10',days:[]};
  expect(sealDays(archive,[],[r],'America/New_York',at,deadlines).days).toEqual([]);
  expect(sealDays(archive,[],[r],'America/New_York','2026-09-11T07:00Z',deadlines).days).toHaveLength(1);
});
