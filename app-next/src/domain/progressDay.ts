import type { Rule } from './types';
import { dayKey } from './calendar';
import { currentInstances, windowInstances } from './schedule';

/** Event accounting owns the containing instance first; before a window, B8
 * permits today's scheduled instance. Unscheduled activity never creates a row. */
export function progressDay(rule: Rule, at: string, timezone: string): string | null {
  if (!rule.enabled) return null;
  const containing = currentInstances(rule, at, timezone)[0];
  if (containing) return containing.day;
  const today = dayKey(at, timezone);
  return windowInstances(rule, today, timezone).length ? today : null;
}
