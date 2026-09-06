import { HistoryDay } from '../ports/models';
import { Rule, RuleDay } from '../domain/types';
import { dayKey, windowInstances } from '../domain/schedule';
import { isMetDay } from '../domain/streak';
export function todayHistory(
  history: HistoryDay[],
  rules: Rule[],
  days: RuleDay[],
  now: string,
  tz: string,
): HistoryDay[] {
  const today = dayKey(now, tz),
    scheduled = rules.filter((r) => r.enabled && windowInstances(r, today, tz).length);
  const base = history.find((d) => d.day === today) ?? {
    day: today,
    usageMinutes: null,
    activity: { walking: 0, gym: 0, running: 0, biking: 0 },
    met: false,
    scheduled: false,
  };
  const current = {
    ...base,
    scheduled: scheduled.length > 0,
    met: isMetDay(
      scheduled,
      days.filter((d) => d.day === today),
      0,
    ),
  };
  return [...history.filter((d) => d.day !== today), current].sort((a, b) => a.day.localeCompare(b.day));
}
