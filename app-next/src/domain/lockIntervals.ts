import { addDays, localInstant } from './calendar';
import { DayKey, Rule } from './types';
import { windowInstances } from './schedule';

export type LockInterval = {
  start: string;
  end: string;
  ruleIds: string[];
  timezone: string;
};

export function mergedLockIntervals(rules: Rule[], fromDay: DayKey, days: number, timezone: string): LockInterval[] {
  if (!Number.isInteger(days) || days < 1) return [];
  const horizonStart = Date.parse(localInstant(fromDay, 0, timezone));
  const horizonEnd = Date.parse(localInstant(addDays(fromDay, days), 0, timezone));
  const candidates = Array.from({ length: days + 2 }, (_, index) => addDays(fromDay, index - 1))
    .flatMap((day) => rules.flatMap((rule) => windowInstances(rule, day, timezone)))
    .filter((interval) => Date.parse(interval.end) > horizonStart && Date.parse(interval.start) < horizonEnd)
    .sort((left, right) => left.start.localeCompare(right.start) || left.end.localeCompare(right.end));

  return candidates.reduce<LockInterval[]>((merged, interval) => {
    const previous = merged.at(-1);
    if (!previous || Date.parse(interval.start) > Date.parse(previous.end)) {
      merged.push({
        start: interval.start,
        end: interval.end,
        ruleIds: [interval.ruleId],
        timezone,
      });
      return merged;
    }
    if (Date.parse(interval.end) > Date.parse(previous.end)) previous.end = interval.end;
    previous.ruleIds = [...new Set([...previous.ruleIds, interval.ruleId])].sort();
    return merged;
  }, []);
}
