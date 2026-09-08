import { DayKey } from '../../domain/types';
import { readUsage, writeUsageDay } from './appGroup';
import {
  DeviceActivityApi,
  DeviceActivityEventRecord,
} from '../../engine/screentime/native/deviceActivityTypes';
import {
  USAGE_MONITOR_PREFIX,
  usageDayFromMonitorName,
  usageEventMinutes,
  usageEvents,
  usageMonitorName,
  usageSchedule,
} from './schedules';

/**
 * The highest cumulative threshold the day's monitor reached. The extension records each firing
 * in the app group; the app turns that record into minutes, because no action type can add up a
 * counter on the OS side.
 */
export function measuredMinutes(events: readonly DeviceActivityEventRecord[]): number {
  return events.reduce((highest, event) => {
    const minutes = event.eventName ? usageEventMinutes(event.eventName) : null;
    return minutes === null ? highest : Math.max(highest, minutes);
  }, 0);
}

const isUsageMonitor = (name: string) => name.startsWith(`${USAGE_MONITOR_PREFIX}.`);

/**
 * Arms today's usage monitor and seals every earlier day's total first, since cleaning an
 * activity drops the events the total is made of. Registering it is what makes the day measured:
 * a day the app never opened has no monitor and stays unmeasured for good.
 */
export async function armUsageMonitor(
  api: DeviceActivityApi,
  { day, timezone, familyActivitySelection }: { day: DayKey; timezone: string; familyActivitySelection: string },
): Promise<void> {
  const today = usageMonitorName(day);
  const running = api.getActivities().filter(isUsageMonitor);
  running
    .filter((name) => name !== today)
    .forEach((stale) => {
      const staleDay = usageDayFromMonitorName(stale);
      if (staleDay) writeUsageDay(api, staleDay, measuredMinutes(api.getEvents(stale)));
      api.stopMonitoring([stale]);
      api.cleanUpAfterActivity(stale);
    });
  if (!running.includes(today)) {
    await api.startMonitoring(today, usageSchedule(day, timezone), usageEvents(familyActivitySelection));
  }
  refreshUsage(api, day);
}

/** Reads what the extension has recorded so far and stores it against the day. */
export function refreshUsage(api: DeviceActivityApi, day: DayKey): number {
  const minutes = measuredMinutes(api.getEvents(usageMonitorName(day)));
  writeUsageDay(api, day, minutes);
  return minutes;
}

/** Seals the day's total and retires its monitor; a lapse takes measurement down with enforcement. */
export function stopUsageMonitor(api: DeviceActivityApi): void {
  api
    .getActivities()
    .filter(isUsageMonitor)
    .forEach((name) => {
      const measured = usageDayFromMonitorName(name);
      if (measured) writeUsageDay(api, measured, measuredMinutes(api.getEvents(name)));
      api.stopMonitoring([name]);
      api.cleanUpAfterActivity(name);
    });
}

/** `null` for a day with no monitor: unmeasured, which Analytics renders differently from zero. */
export function measuredDay(api: DeviceActivityApi, day: DayKey): number | null {
  return readUsage(api).days[day] ?? null;
}
