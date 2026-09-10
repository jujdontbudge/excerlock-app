import type { HistoryDay } from '../ports/models';
import type { GymInterval } from './gymMachine';
import type { Rule, RuleDay } from './types';
import { addDays, dayKey } from './calendar';
import { windowInstances } from './schedule';
import { isMetDay } from './streak';
import { measuredGymMinutesByDay } from './projectGymHistory';

/** Production read model from measured facts only; missing usage is always an explicit gap. */
export function projectMeasuredHistory(
  stepsByDay: Readonly<Record<string, number>>,
  gymIntervals: readonly GymInterval[],
  configuredRegionIds: readonly string[],
  rules: readonly Rule[],
  ruleDays: readonly RuleDay[],
  timezone: string,
  now: string,
): HistoryDay[] {
  const today = dayKey(now, timezone);
  const gym = measuredGymMinutesByDay(gymIntervals, configuredRegionIds, timezone, now);
  for (const steps of Object.values(stepsByDay))
    if (!Number.isSafeInteger(steps) || steps < 0) throw new Error('Invalid measured daily steps');
  const facts = [...Object.keys(stepsByDay), ...Object.keys(gym), ...ruleDays.map((r) => r.day), today].sort();
  const cutoff = addDays(today, -399);
  const earliest = facts[0] ?? today;
  const first = earliest < cutoff ? cutoff : earliest;
  const result: HistoryDay[] = [];
  for (let day = first; day <= today; day = addDays(day, 1)) {
    const scheduled = rules.filter(
      (rule) =>
        rule.enabled &&
        (!Number.isFinite(Date.parse(rule.createdAt)) || dayKey(rule.createdAt, timezone) <= day) &&
        windowInstances(rule, day, timezone).length > 0,
    );
    const rows = ruleDays.filter((row) => row.day === day);
    const liveStateProgress = Math.max(
      0,
      ...rows
        .filter((row) => scheduled.some((rule) => rule.id === row.ruleId && rule.mode.kind === 'state'))
        .map((row) => row.progress),
    );
    result.push({
      day,
      usageMinutes: null,
      activity: { walking: stepsByDay[day] ?? 0, gym: gym[day] ?? 0 },
      scheduled: scheduled.length > 0,
      met: isMetDay(scheduled, rows, liveStateProgress),
    });
  }
  return result;
}
