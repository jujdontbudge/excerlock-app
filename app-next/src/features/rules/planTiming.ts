import { Rule } from '../../domain/types';
import { isActiveAt, nextInstanceStart } from '../../domain/schedule';
import { minuteLabel } from '../../domain/scheduleLabel';
export type PlanStart = { now: boolean; time: string | null };
/**
 * When the drafted plan takes effect, so the summary can say it before Save.
 * Pure: the clock is passed in, never read.
 */
export function planStart(rule: Rule, now: string, timezone: string): PlanStart {
  if (isActiveAt(rule, now, timezone)) return { now: true, time: null };
  const next = nextInstanceStart([rule], now, timezone);
  if (!next) return { now: false, time: null };
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(next));
  const value = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  return { now: false, time: minuteLabel(value('hour') * 60 + value('minute')) };
}
