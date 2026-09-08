import { compileMonitorPlan } from '../../../domain/monitorPlan';
import { mergedLockIntervals } from '../../../domain/lockIntervals';
import { Rule } from '../../../domain/types';
import { rule } from '../../../domain/__tests__/fixtures';
import {
  dateComponents,
  leaseSchedule,
  LEASE_MINUTES,
  monitorSchedule,
  USAGE_CAP_MINUTES,
  USAGE_STEP_MINUTES,
  usageEvents,
  usageMonitorName,
  usageSchedule,
} from '../schedules';

const scheduled = (id: string, days: Rule['schedule']['days'], window: Rule['schedule']['window']): Rule => ({
  ...rule,
  id,
  schedule: { days, window },
});

const plan = (rules: Rule[], fromDay: string, days: number, timezone: string) =>
  compileMonitorPlan(mergedLockIntervals(rules, fromDay, days, timezone), `${fromDay}T00:00:00.000Z`);

const range = (startMinute: number, endMinute: number): Rule['schedule']['window'] => ({
  kind: 'range',
  startMinute,
  endMinute,
});

test('components are the wall clock of the rule timezone, stamped with that zone', () => {
  expect(dateComponents('2026-09-07T13:00:00.000Z', 'America/New_York')).toEqual({
    year: 2026,
    month: 9,
    day: 7,
    hour: 9,
    minute: 0,
    second: 0,
    timeZoneIdentifier: 'America/New_York',
  });
  expect(dateComponents('2026-09-07T13:00:00.000Z', 'Europe/Berlin')).toMatchObject({
    hour: 15,
    timeZoneIdentifier: 'Europe/Berlin',
  });
});

test('a weekday set becomes one absolute non-repeating schedule per scheduled day', () => {
  const monitors = plan([scheduled('walk', [1, 3, 5], range(540, 1020))], '2026-09-07', 7, 'America/New_York').monitors;
  const schedules = monitors.map(monitorSchedule);

  expect(schedules).toHaveLength(3);
  expect(schedules.map((s) => s.intervalStart.day)).toEqual([7, 9, 11]);
  expect(schedules.every((s) => s.repeats === false)).toBe(true);
  expect(schedules.every((s) => s.intervalStart.hour === 9 && s.intervalEnd.hour === 17)).toBe(true);
});

test('a window across midnight ends on the following day', () => {
  const [schedule] = plan([scheduled('walk', [1], range(1320, 360))], '2026-09-07', 1, 'America/New_York').monitors.map(
    monitorSchedule,
  );

  expect(schedule.intervalStart).toMatchObject({ day: 7, hour: 22 });
  expect(schedule.intervalEnd).toMatchObject({ day: 8, hour: 6 });
});

test('adjacent all-day windows are one schedule spanning both local midnights', () => {
  const monitors = plan([scheduled('walk', [1, 2], { kind: 'allDay' })], '2026-09-07', 2, 'America/New_York').monitors;
  const schedules = monitors.map(monitorSchedule);

  expect(schedules).toHaveLength(1);
  expect(schedules[0].intervalStart).toMatchObject({ day: 7, hour: 0, minute: 0 });
  expect(schedules[0].intervalEnd).toMatchObject({ day: 9, hour: 0, minute: 0 });
});

test('a window over a spring-forward transition keeps its wall-clock hours', () => {
  const [monitor] = plan([scheduled('walk', [0], range(60, 300))], '2027-03-14', 1, 'America/New_York').monitors;
  const schedule = monitorSchedule(monitor);

  expect(schedule.intervalStart).toMatchObject({ hour: 1, timeZoneIdentifier: 'America/New_York' });
  expect(schedule.intervalEnd).toMatchObject({ hour: 5, timeZoneIdentifier: 'America/New_York' });
  // Four wall-clock hours, three real ones: the components are what iOS must be given.
  expect(Date.parse(monitor.end) - Date.parse(monitor.start)).toBe(3 * 60 * 60 * 1000);
});

test('the walking lease backdates its start so the interval is already running when registered', () => {
  const schedule = leaseSchedule('2026-09-07T13:10:00.000Z', 'America/New_York');

  expect(schedule.intervalEnd).toMatchObject({ hour: 9, minute: 10 });
  expect(schedule.intervalStart).toMatchObject({ hour: 8, minute: 55 });
  expect(schedule.repeats).toBe(false);
  expect(LEASE_MINUTES).toBe(15);
});

test('the usage monitor covers one local day and is named for it', () => {
  const schedule = usageSchedule('2026-09-07', 'America/New_York');

  expect(usageMonitorName('2026-09-07')).toBe('excerlock.usage.v1.2026-09-07');
  expect(schedule.intervalStart).toMatchObject({ year: 2026, month: 9, day: 7, hour: 0, minute: 0 });
  expect(schedule.intervalEnd).toMatchObject({ year: 2026, month: 9, day: 8, hour: 0, minute: 0 });
  expect(schedule.repeats).toBe(false);
});

test('usage events are cumulative five-minute thresholds that count activity before registration', () => {
  const events = usageEvents('selection-token');

  expect(events).toHaveLength(USAGE_CAP_MINUTES / USAGE_STEP_MINUTES);
  expect(events[0]).toEqual({
    familyActivitySelection: 'selection-token',
    threshold: { minute: 5, second: 0 },
    eventName: 'excerlock.usage.5',
    includesPastActivity: true,
  });
  expect(events.at(-1)).toMatchObject({ threshold: { minute: USAGE_CAP_MINUTES, second: 0 } });
  expect(new Set(events.map((event) => event.eventName)).size).toBe(events.length);
});
