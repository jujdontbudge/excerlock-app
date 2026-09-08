import { scheduleDraft, reduceSchedule, toSchedule, scheduleIssues } from '../scheduleDraft';
import { scheduleLabel } from '../../../domain/scheduleLabel';
import { MIN_WINDOW_MINUTES } from '../../../domain/validateRule';
test('weekday and time defaults, all-day toggling preserves the selected range', () => {
  let d = scheduleDraft({});
  expect(toSchedule(d)).toEqual({
    days: [1, 2, 3, 4, 5],
    window: { kind: 'range', startMinute: 540, endMinute: 1260 },
  });
  d = reduceSchedule(d, { type: 'start', value: 1200 });
  d = reduceSchedule(d, { type: 'end', value: 120 });
  expect(scheduleIssues(d)).toEqual([]);
  expect(scheduleLabel(toSchedule(d))).toContain('ends next day');
  d = reduceSchedule(d, { type: 'allDay', value: true });
  expect(toSchedule(d).window.kind).toBe('allDay');
  d = reduceSchedule(d, { type: 'allDay', value: false });
  expect(toSchedule(d).window).toMatchObject({ startMinute: 1200, endMinute: 120 });
});
test('empty days and windows under the domain minimum cannot continue', () => {
  expect(scheduleIssues({ ...scheduleDraft({}), days: [] })).toContain('days');
  expect(
    scheduleIssues({ ...scheduleDraft({}), start: 540, end: 540 + MIN_WINDOW_MINUTES - 1 }),
  ).toContain('window');
  expect(scheduleIssues({ ...scheduleDraft({}), start: 540, end: 540 + MIN_WINDOW_MINUTES })).toEqual([]);
});
