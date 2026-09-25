import type { Rule } from '../../model/types';
import { dayKey } from '../../schedule/calendar';
import { currentInstances, windowInstances } from '../../schedule/schedule';

export function progressDay(rule: Rule, at: string, timezone: string): string | null {
  if (!rule.enabled) return null;
  const containing = currentInstances(rule, at, timezone)[0];
  if (containing) return containing.day;
  const today = dayKey(at, timezone);
  return windowInstances(rule, today, timezone).length ? today : null;
}
