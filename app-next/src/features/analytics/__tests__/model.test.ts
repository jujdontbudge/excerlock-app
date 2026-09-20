import { analyticsModel } from '../analyticsModel';
import { nearestEnabledTrendIndex, trendPoints } from '../trendModel';
import { HistoryDay } from '../../../ports/models';
import { Rule, RuleMode } from '../../../domain/types';
const makeRule = (id: string, mode: RuleMode): Rule => ({
  id,
  activity: mode.activity,
  mode,
  schedule: { days: [1, 2, 3, 4, 5], window: { kind: 'allDay' } },
  enabled: true,
  createdAt: '2026-08-01T12:00:00.000Z',
  updatedAt: '2026-08-01T12:00:00.000Z',
});
const row = (day: string, usageMinutes: number | null, scheduled = true, met = true): HistoryDay => ({
  day,
  usageMinutes,
  scheduled,
  met,
  activity: { walking: 2000, gym: 30 },
});
test('month view shows one bucket per calendar day', () => {
  const model = analyticsModel([row('2026-09-01', 240), row('2026-09-02', 60)], '2026-09-07', 'Month', 0, 180);
  expect(model.start).toBe('2026-09-01');
  expect(model.end).toBe('2026-09-30');
  expect(model.series).toHaveLength(30);
  expect(model.series[0].reclaimed).toBe(0);
  expect(model.series[1].reclaimed).toBe(120);
});
test('partial weeks exclude unmeasured days from replaced math and future days from denominator', () => {
  const m = analyticsModel([row('2026-09-07', 60), row('2026-09-08', null)], '2026-09-09', 'Week', 0, 180);
  expect(m.reclaimed).toEqual({ minutes: 120, measuredDays: 1 });
  expect(m.elapsedDays).toBe(3);
  expect(m.series.map((s) => s.value)).toEqual([60, null, null, null, null, null, null]);
  expect(m.met).toBe(2);
  expect(m.scheduled).toBe(2);
});
test('day view scopes totals to one day but keeps its surrounding week as the dot row', () => {
  const m = analyticsModel([row('2026-09-07', 60), row('2026-09-08', 30)], '2026-09-08', 'Day', 0, 180);
  expect(m.reclaimed).toEqual({ minutes: 150, measuredDays: 1 });
  expect(m.previous.minutes).toBe(120);
  expect(m.series).toHaveLength(7);
  expect(m.series.map((s) => s.met)).toEqual([true, true, false, false, false, false, false]);
  expect(analyticsModel([], '2026-09-08', 'Day', -1, 180)).toMatchObject({ start: '2026-09-07', end: '2026-09-07' });
});
test('unscheduled days do not break streak; previous period is independent', () => {
  const m = analyticsModel(
    [
      row('2026-09-04', 60),
      row('2026-09-05', null, false, false),
      row('2026-09-06', null, false, false),
      row('2026-09-07', 30),
    ],
    '2026-09-07',
    'Week',
    0,
    180,
  );
  expect(m.streak.current).toBe(2);
  expect(m.previous.minutes).toBe(120);
  expect(m.delta).toBe(30);
  expect(m.activities.walking).toBe(2000);
});
test('trend points select exact days, weeks, and months without exposing future days', () => {
  const history = [row('2026-09-07', 60), row('2026-09-08', 30)];
  const days = trendPoints('Day', '2026-09-09', history, 'walking');
  expect(days.map((point) => point.label)).toEqual(['THU', 'FRI', 'SAT', 'SUN', 'MON', 'TUE', 'WED']);
  expect(days.map((point) => point.offset)).toEqual([-6, -5, -4, -3, -2, -1, 0]);
  expect(nearestEnabledTrendIndex(days, 100, 100)).toBe(6);

  expect(trendPoints('Week', '2026-09-09', history, 'walking').map((point) => point.offset)).toEqual([-7, -6, -5, -4, -3, -2, -1, 0]);
  expect(trendPoints('Month', '2026-09-09', history, 'walking')).toHaveLength(12);
});

test('history keeps a cross-midnight result on its supplied start day', () => {
  const m = analyticsModel([row('2026-09-06', 70)], '2026-09-07', 'Week', -1, 180);
  expect(m.series[6].value).toBe(70);
  expect(m.met).toBe(1);
});
test('conditions drive arrivals and verified walking minutes inside the period', () => {
  const rules = [
    makeRule('arrive', { kind: 'event', activity: 'gym', trigger: 'arrival' }),
    makeRule('walk', { kind: 'state', activity: 'walking' }),
  ];
  const ruleDays = [
    { ruleId: 'arrive', day: '2026-09-01', progress: 1, met: true, metAt: null },
    { ruleId: 'arrive', day: '2026-09-07', progress: 1, met: true, metAt: null },
    { ruleId: 'arrive', day: '2026-09-04', progress: 0, met: false, metAt: null },
    { ruleId: 'walk', day: '2026-09-07', progress: 25, met: true, metAt: null },
    { ruleId: 'walk', day: '2026-08-30', progress: 40, met: true, metAt: null },
  ];
  const week = analyticsModel([], '2026-09-07', 'Week', 0, 180, { rules, ruleDays });
  expect(week.arrivals).toBe(1);
  expect(week.walkingMinutes).toBe(25);
  expect(week.conditions).toMatchObject({ gymArrival: true, walking: true, gymMinutes: false, steps: false });
  const month = analyticsModel([row('2026-08-30', 60)], '2026-09-07', 'Month', 0, 180, { rules, ruleDays });
  expect(month.arrivals).toBe(2);
  expect(month.walkingMinutes).toBe(25);
});
