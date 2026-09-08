import { addDays, localInstant } from '../../domain/calendar';
import { LockWindowMonitor } from '../../domain/monitorPlan';
import { DayKey } from '../../domain/types';
import { DeviceActivityDateComponents, DeviceActivityEvent, DeviceActivitySchedule } from './deviceActivity';

/** Apple's minimum DeviceActivity interval, and the length of one walking lease. */
export const LEASE_MINUTES = 15;
export const LEASE_MONITOR = 'excerlock.lease.v1';

export const USAGE_MONITOR_PREFIX = 'excerlock.usage.v1';
export const USAGE_STEP_MINUTES = 5;
/** Usage above the cap reads as the cap: 96 threshold events is the whole day's budget. */
export const USAGE_CAP_MINUTES = 480;

const FIELDS = ['year', 'month', 'day', 'hour', 'minute', 'second'] as const;

/**
 * An instant as the wall clock of a named zone. DeviceActivity schedules are calendar
 * components, not instants, so a rule written in Berlin must not become an hour earlier
 * because the phone is in New York when the app registers it — hence `timeZoneIdentifier`.
 */
export function dateComponents(instant: string, timezone: string): DeviceActivityDateComponents {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(instant));
  const read = (type: (typeof FIELDS)[number]) => Number(parts.find((part) => part.type === type)!.value);
  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: read('hour'),
    minute: read('minute'),
    second: read('second'),
    timeZoneIdentifier: timezone,
  };
}

/** One merged lock window as an absolute, non-repeating schedule. */
export function monitorSchedule(monitor: LockWindowMonitor): DeviceActivitySchedule {
  return {
    intervalStart: dateComponents(monitor.start, monitor.timezone),
    intervalEnd: dateComponents(monitor.end, monitor.timezone),
    repeats: false,
  };
}

/**
 * The one place the backdated `intervalStart` survives (B32 removed the need for it on lock
 * windows): a lease renewed mid-flight would otherwise ask for an interval shorter than the
 * 15 minutes DeviceActivity accepts, so the start is placed one lease behind its end.
 */
export function leaseSchedule(leaseUntil: string, timezone: string): DeviceActivitySchedule {
  const start = new Date(Date.parse(leaseUntil) - LEASE_MINUTES * 60_000).toISOString();
  return {
    intervalStart: dateComponents(start, timezone),
    intervalEnd: dateComponents(leaseUntil, timezone),
    repeats: false,
  };
}

export function usageMonitorName(day: DayKey): string {
  return `${USAGE_MONITOR_PREFIX}.${day}`;
}

export function usageDayFromMonitorName(activityName: string): DayKey | null {
  return activityName.startsWith(`${USAGE_MONITOR_PREFIX}.`)
    ? activityName.slice(USAGE_MONITOR_PREFIX.length + 1)
    : null;
}

/** Midnight to midnight in the user's zone; a new monitor each day keeps the counts separable. */
export function usageSchedule(day: DayKey, timezone: string): DeviceActivitySchedule {
  return {
    intervalStart: dateComponents(localInstant(day, 0, timezone), timezone),
    intervalEnd: dateComponents(localInstant(addDays(day, 1), 0, timezone), timezone),
    repeats: false,
  };
}

export function usageEventName(minutes: number): string {
  return `excerlock.usage.${minutes}`;
}

export function usageEventMinutes(eventName: string): number | null {
  const minutes = Number(eventName.replace('excerlock.usage.', ''));
  return eventName.startsWith('excerlock.usage.') && Number.isFinite(minutes) ? minutes : null;
}

/**
 * Cumulative thresholds every five minutes. `includesPastActivity` counts what the user spent
 * before the app got round to registering the monitor, which is most of a day the app never opened.
 */
export function usageEvents(familyActivitySelection: string): DeviceActivityEvent[] {
  return Array.from({ length: USAGE_CAP_MINUTES / USAGE_STEP_MINUTES }, (_, index) => {
    const minutes = (index + 1) * USAGE_STEP_MINUTES;
    return {
      familyActivitySelection,
      threshold: { minute: minutes, second: 0 },
      eventName: usageEventName(minutes),
      includesPastActivity: true,
    };
  });
}
