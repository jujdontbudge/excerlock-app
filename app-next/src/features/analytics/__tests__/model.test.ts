import { analyticsModel } from '../analyticsModel';
import { HistoryDay } from '../../../ports/models';
const row = (day: string, usageMinutes: number | null, scheduled = true, met = true): HistoryDay => ({
  day,
  usageMinutes,
  scheduled,
  met,
  activity: { walking: 2000, gym: 30, running: 0, biking: 0 },
});
test('grouped reclaimed bars average daily savings after clamping each day', () => {
  const model = analyticsModel([row('2026-09-01', 240), row('2026-09-02', 60)], '2026-09-07', 'Month', 0, 180);
  expect(model.series[0].reclaimed).toBe(60);
  expect(model.series[1].reclaimed).toBeNull();
});
test('partial weeks exclude unmeasured days from reclaimed math and future days from denominator', () => {
  const m = analyticsModel([row('2026-09-07', 60), row('2026-09-08', null)], '2026-09-09', 'Week', 0, 180);
  expect(m.reclaimed).toEqual({ minutes: 120, measuredDays: 1 });
  expect(m.elapsedDays).toBe(3);
  expect(m.series.map((s) => s.value)).toEqual([60, null, null, null, null, null, null]);
  expect(m.met).toBe(2);
  expect(m.scheduled).toBe(2);
});
test('calendar month and year navigate including leap days', () => {
  expect(analyticsModel([], '2024-03-01', 'Month', -1, 180)).toMatchObject({
    start: '2024-02-01',
    end: '2024-02-29',
    elapsedDays: 29,
  });
  expect(analyticsModel([], '2024-03-01', 'Year', 0, 180).series).toHaveLength(12);
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
test('history keeps a cross-midnight result on its supplied start day', () => {
  const m = analyticsModel([row('2026-09-06', 70)], '2026-09-07', 'Week', -1, 180);
  expect(m.series[6].value).toBe(70);
  expect(m.met).toBe(1);
});
