import { readUsage } from '../appGroup';
import { usageEventName, usageMonitorName, USAGE_CAP_MINUTES, USAGE_STEP_MINUTES } from '../schedules';
import { armUsageMonitor, measuredDay, measuredMinutes, refreshUsage } from '../usage';
import { deviceActivityDouble } from './DeviceActivityDouble';

const timezone = 'America/New_York';
const arm = (native: ReturnType<typeof deviceActivityDouble>, day: string) =>
  armUsageMonitor(native.api, { day, timezone, familyActivitySelection: 'selection-token' });

test('a day with a monitor reads as measured zero, a day without reads as unmeasured', async () => {
  const native = deviceActivityDouble();

  expect(measuredDay(native.api, '2026-09-07')).toBeNull();
  await arm(native, '2026-09-07');

  expect(native.monitors.has(usageMonitorName('2026-09-07'))).toBe(true);
  expect(measuredDay(native.api, '2026-09-07')).toBe(0);
  expect(measuredDay(native.api, '2026-09-06')).toBeNull();
});

test('usage is the highest threshold the extension reached, at five-minute resolution', async () => {
  const native = deviceActivityDouble();
  await arm(native, '2026-09-07');

  native.fireThreshold(usageMonitorName('2026-09-07'), usageEventName(5), '2026-09-07T14:00:00.000Z');
  native.fireThreshold(usageMonitorName('2026-09-07'), usageEventName(10), '2026-09-07T14:30:00.000Z');

  expect(refreshUsage(native.api, '2026-09-07')).toBe(10);
  expect(measuredDay(native.api, '2026-09-07')).toBe(10);
  expect(USAGE_STEP_MINUTES).toBe(5);
});

test('arming a new day seals yesterday’s total before its events are cleaned up', async () => {
  const native = deviceActivityDouble();
  await arm(native, '2026-09-07');
  native.fireThreshold(usageMonitorName('2026-09-07'), usageEventName(35), '2026-09-07T23:00:00.000Z');

  await arm(native, '2026-09-08');

  expect(measuredDay(native.api, '2026-09-07')).toBe(35);
  expect(native.cleaned).toEqual([usageMonitorName('2026-09-07')]);
  expect(native.monitors.has(usageMonitorName('2026-09-07'))).toBe(false);
  expect([...native.monitors.keys()]).toContain(usageMonitorName('2026-09-08'));
});

test('re-arming the same day does not restart the monitor', async () => {
  const native = deviceActivityDouble();
  await arm(native, '2026-09-07');
  const registered = native.monitors.get(usageMonitorName('2026-09-07'));

  await arm(native, '2026-09-07');

  expect(native.monitors.get(usageMonitorName('2026-09-07'))).toBe(registered);
  expect(native.cleaned).toEqual([]);
});

test('usage above the cap reads as the cap', () => {
  expect(
    measuredMinutes([
      { activityName: 'a', callbackName: 'eventDidReachThreshold', eventName: usageEventName(USAGE_CAP_MINUTES), lastCalledAt: new Date() },
    ]),
  ).toBe(USAGE_CAP_MINUTES);
  expect(measuredMinutes([{ activityName: 'a', callbackName: 'intervalDidStart', lastCalledAt: new Date() }])).toBe(0);
});

test('the sealed record survives as history for the days the app was closed', async () => {
  const native = deviceActivityDouble();
  await arm(native, '2026-09-07');
  native.fireThreshold(usageMonitorName('2026-09-07'), usageEventName(20), '2026-09-07T20:00:00.000Z');
  await arm(native, '2026-09-09');

  expect(readUsage(native.api).days).toEqual({ '2026-09-07': 20, '2026-09-09': 0 });
});

test('a warning callback is not a threshold the user reached', () => {
  // getEvents reports the will-reach warnings too, under the same event name as the threshold they
  // precede. Counting one would credit minutes that have not been spent.
  expect(
    measuredMinutes([
      {
        activityName: usageMonitorName('2026-09-07'),
        callbackName: 'eventDidReachThreshold',
        eventName: usageEventName(15),
        lastCalledAt: new Date('2026-09-07T14:00:00.000Z'),
      },
      {
        activityName: usageMonitorName('2026-09-07'),
        callbackName: 'eventWillReachThresholdWarning',
        eventName: usageEventName(20),
        lastCalledAt: new Date('2026-09-07T14:04:00.000Z'),
      },
    ]),
  ).toBe(15);
});
