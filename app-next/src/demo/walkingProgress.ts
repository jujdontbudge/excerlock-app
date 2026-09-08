import { Rule } from '../domain/types';
import { ruleDaysStore } from '../state/ruleDaysStore';
import { dayKey } from '../domain/calendar';
import { applyProgress } from '../domain/progress';
/**
 * Writes the minutes a walking session has earned onto the row for the day the session started on.
 * The latch lives in `applyProgress`, so a duration rule becomes met at its goal and stays met, while a
 * state rule never does. `at` is the instant the credit is observed and becomes `metAt`.
 */
export function writeWalkingProgress(rule: Rule, startedAt: string, tz: string, minutes: number, at = startedAt) {
  const day = dayKey(startedAt, tz),
    days = ruleDaysStore.getState().data.days,
    current = days.find((d) => d.ruleId === rule.id && d.day === day);
  const row = applyProgress(rule, current ?? { ruleId: rule.id, day, progress: 0, met: false, metAt: null }, minutes, at);
  ruleDaysStore.getState().patch({ days: [...days.filter((d) => !(d.ruleId === rule.id && d.day === day)), row] });
}
