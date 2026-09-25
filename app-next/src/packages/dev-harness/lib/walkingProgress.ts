import { Rule } from '../../model/types';
import { ruleDaysStore } from '../../conditions/ruleDaysStore';
import { dayKey } from '../../schedule/calendar';
export function writeWalkingProgress(rule: Rule, now: string, tz: string, minutes: number) {
  const day = dayKey(now, tz),
    days = ruleDaysStore.getState().data.days;
  const row = { ruleId: rule.id, day, progress: minutes, met: false, metAt: null };
  ruleDaysStore.getState().patch({ days: [...days.filter((d) => !(d.ruleId === rule.id && d.day === day)), row] });
}
