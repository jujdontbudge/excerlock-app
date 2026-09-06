import { Rule, RuleDay } from './types';
export function applyProgress(rule: Rule, row: RuleDay, value: number, now: string): RuleDay {
  if (!Number.isFinite(value)) throw new Error('Invalid progress');
  const progress = Math.max(0, value),
    mode = rule.mode;
  const reached = mode.kind === 'target' ? progress >= mode.goal : mode.kind === 'event' && progress >= 1;
  const met = mode.kind !== 'state' && (row.met || reached);
  return { ...row, progress, met, metAt: met ? (row.metAt ?? now) : null };
}
