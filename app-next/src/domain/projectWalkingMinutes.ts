import type { Rule, RuleDay } from './types';
import { windowInstances } from './schedule';
import { applyProgress } from './progress';

/** Projects only measured verified milliseconds. Steps and live grace never enter this path. */
export function projectWalkingMinutes(
  rules: readonly Rule[], rows: readonly RuleDay[], totals: Readonly<Record<string, number>>,
  timezone: string, observedAt: string,
): RuleDay[] {
  const result = [...rows];
  for (const [day, milliseconds] of Object.entries(totals)) {
    if (!Number.isSafeInteger(milliseconds) || milliseconds < 0) throw new Error('Invalid measured walking duration');
    const minutes = Math.floor(milliseconds / 60_000);
    for (const rule of rules) {
      if (!rule.enabled || rule.mode.kind !== 'target' || rule.mode.activity !== 'walking' ||
        rule.mode.metric !== 'minutes' || !windowInstances(rule, day, timezone).length) continue;
      const index = result.findIndex((row) => row.ruleId === rule.id && row.day === day);
      const row = index < 0 ? { ruleId: rule.id, day, progress: 0, met: false, metAt: null } : result[index];
      const next = applyProgress(rule, row, Math.max(row.progress, minutes), observedAt);
      if (index < 0) result.push(next); else result[index] = next;
    }
  }
  return result;
}
