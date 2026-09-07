import { Rule } from '../../domain/types';
export function unlockKind(rule: Rule): 'gym' | 'treadmill' | null {
  if (rule.activity === 'gym' && (rule.mode.kind === 'event' || rule.mode.kind === 'target')) return 'gym';
  if (rule.mode.kind === 'state' && rule.mode.place !== 'outside') return 'treadmill';
  return null;
}
