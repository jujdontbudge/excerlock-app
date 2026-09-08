// merge: replace with P2-T19 domain/conditionState.ts
import { Rule, RuleDay } from '../../domain/types';
import { dayKey, isActiveAt, windowInstances } from '../../domain/schedule';
import { minuteLabel } from '../../domain/scheduleLabel';
import { conditionsCopy as c } from '../../content/conditions';
export type ConditionStatus = { text: string; tone: 'paused' | 'active' | 'met' | 'idle' };
/**
 * One scannable line per condition row. Pure: everything it needs is the rule,
 * today's progress rows and the clock, so the list never has to reason about state.
 */
export function conditionStatus(rule: Rule, ruleDays: readonly RuleDay[], now: string, tz: string): ConditionStatus {
  const today = dayKey(now, tz);
  const met = ruleDays.some((d) => d.ruleId === rule.id && d.day === today && d.met);
  if (!rule.enabled)
    return { text: rule.pausedReason === 'noGym' ? c.statusNoGym : c.statusPaused, tone: 'paused' };
  if (met) return { text: c.statusMet, tone: 'met' };
  if (isActiveAt(rule, now, tz)) return { text: c.statusActive, tone: 'active' };
  const upcoming = windowInstances(rule, today, tz).find((w) => Date.parse(w.start) > Date.parse(now));
  const window = rule.schedule.window;
  if (upcoming)
    return { text: c.statusLater(minuteLabel(window.kind === 'range' ? window.startMinute : 0)), tone: 'idle' };
  return { text: c.statusIdle, tone: 'idle' };
}
