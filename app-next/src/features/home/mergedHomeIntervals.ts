import { Rule, DayKey } from '../../domain/types';
import { addDays, localInstant } from '../../domain/calendar';
import { mergedLockIntervals } from '../../domain/lockIntervals';

export type HomeInterval = { startMinute: number; endMinute: number };

/**
 * The day's lock windows as minutes on Home's 24-hour axis. The merge itself is the domain's
 * (`mergedLockIntervals`); this only projects it onto the day the timeline is drawing, so a window
 * that started yesterday is left to yesterday's axis and one that runs past midnight draws to the end.
 */
export function mergedHomeIntervals(rules: Rule[], day: DayKey, timezone: string): HomeInterval[] {
  const dayStart = Date.parse(localInstant(day, 0, timezone));
  const dayEnd = Date.parse(localInstant(addDays(day, 1), 0, timezone));
  return mergedLockIntervals(rules, day, 1, timezone)
    .filter((interval) => Date.parse(interval.start) >= dayStart)
    .map((interval) => ({
      startMinute: dayMinute(interval.start, timezone),
      endMinute: Date.parse(interval.end) < dayEnd ? dayMinute(interval.end, timezone) : 1440,
    }));
}

/** Minutes after local midnight, so the timeline can highlight the window containing now. */
export function dayMinute(now: string, timezone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone,
  }).formatToParts(new Date(now));
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return (value('hour') % 24) * 60 + value('minute');
}
