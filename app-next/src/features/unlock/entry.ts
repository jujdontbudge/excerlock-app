import { Rule } from '../../domain/types';
export function unlockKind(rule: Rule): 'gym' | null {
  if (rule.activity === 'gym' && (rule.mode.kind === 'event' || rule.mode.kind === 'target')) return 'gym';
  return null;
}
