import type { Rule, RuleDay } from './types';
import { windowInstances } from './schedule';
import { applyProgress } from './progress';
/** Measured daily history may satisfy step targets before a window; never grants live state relief. */
export function projectStepHistory(rules: readonly Rule[], rows: readonly RuleDay[], totals: Readonly<Record<string, number>>, timezone: string, observedAt: string): RuleDay[] {
  const result = [...rows];
  for (const [day, steps] of Object.entries(totals)) {
    if (!Number.isSafeInteger(steps) || steps < 0) throw new Error('Invalid measured daily steps');
    for (const rule of rules) {
      if (!rule.enabled || rule.mode.kind !== 'target' || rule.mode.activity !== 'walking' || rule.mode.metric !== 'steps' || !windowInstances(rule, day, timezone).length) continue;
      const index = result.findIndex((row) => row.ruleId === rule.id && row.day === day);
      const row = index < 0 ? { ruleId: rule.id, day, progress: 0, met: false, metAt: null } : result[index];
      const next = applyProgress(rule, row, Math.max(row.progress, steps), observedAt);
      if (index < 0) result.push(next); else result[index] = next;
    }
  }
  return result;
}
