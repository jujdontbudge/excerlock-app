import { addDays, localInstant } from '../../domain/calendar';
import { DayKey } from '../../domain/types';
import { DeviceActivityDateComponents } from '../../engine/screentime/native/deviceActivitySchedule';
import { DeviceActivityEvent } from '../../engine/screentime/native/deviceActivityTypes';

type DeviceActivitySchedule = Readonly<{
  intervalStart: DeviceActivityDateComponents;
  intervalEnd: DeviceActivityDateComponents;
  repeats: boolean;
}>;

export const USAGE_MONITOR_PREFIX = 'excerlock.usage.v1';
export const USAGE_STEP_MINUTES = 5;
/** Usage above the cap reads as the cap: 96 threshold events is the whole day's budget. */
export const USAGE_CAP_MINUTES = 480;

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
  const read = (type: 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second') =>
    Number(parts.find((part) => part.type === type)!.value);
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
