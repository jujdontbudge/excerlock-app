import { addDays, dayKey, localInstant } from './calendar';
import { currentInstances, windowInstances } from './schedule';
import { DayKey, Rule } from './types';

export function progressDay(rule: Rule, at: string, timezone: string): DayKey | null {
  const containing = currentInstances(rule, at, timezone)[0];
  if (containing) return containing.day;
  return windowInstances(rule, dayKey(at, timezone), timezone)[0]?.day ?? null;
}

export type DayInterval = { day: DayKey; from: string; to: string };

export function splitAtMidnight(from: string, to: string, timezone: string): DayInterval[] {
  const end = Date.parse(to);
  let cursor = Date.parse(from);
  const result: DayInterval[] = [];
  while (cursor < end) {
    const day = dayKey(new Date(cursor).toISOString(), timezone);
    const resolvedMidnight = localInstant(addDays(day, 1), 0, timezone);
    if (__DEV__ && !resolvedMidnight.converged) throw new Error('LOCAL_MIDNIGHT_DID_NOT_CONVERGE');
    const midnight = Date.parse(resolvedMidnight.instant);
    const segmentEnd = Math.min(end, midnight);
    result.push({ day, from: new Date(cursor).toISOString(), to: new Date(segmentEnd).toISOString() });
    cursor = segmentEnd;
  }
  return result;
}
