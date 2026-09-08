import {
  dateComponents,
  USAGE_CAP_MINUTES,
  USAGE_STEP_MINUTES,
  usageDayFromMonitorName,
  usageEventMinutes,
  usageEvents,
  usageMonitorName,
  usageSchedule,
} from '../schedules';

test('components are the wall clock of a named zone, stamped with that zone', () => {
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

test('the usage monitor covers one local day and is named for it', () => {
  const schedule = usageSchedule('2026-09-07', 'America/New_York');

  expect(usageMonitorName('2026-09-07')).toBe('excerlock.usage.v1.2026-09-07');
  expect(usageDayFromMonitorName('excerlock.usage.v1.2026-09-07')).toBe('2026-09-07');
  expect(usageDayFromMonitorName('excerlock.lock.abc')).toBeNull();
  expect(schedule.intervalStart).toMatchObject({ year: 2026, month: 9, day: 7, hour: 0, minute: 0 });
  expect(schedule.intervalEnd).toMatchObject({ year: 2026, month: 9, day: 8, hour: 0, minute: 0 });
  expect(schedule.repeats).toBe(false);
});

test('a day that loses an hour still ends at the next local midnight', () => {
  const schedule = usageSchedule('2027-03-14', 'America/New_York');

  expect(schedule.intervalStart).toMatchObject({ day: 14, hour: 0 });
  expect(schedule.intervalEnd).toMatchObject({ day: 15, hour: 0 });
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
  expect(usageEventMinutes('excerlock.usage.35')).toBe(35);
  expect(usageEventMinutes('excerlock.lock.abc')).toBeNull();
});
