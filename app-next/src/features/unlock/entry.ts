import { Rule } from '../../domain/types';
import { unlockCopy as c } from '../../content/unlock';
export function unlockKind(rule: Rule): 'gym' | null {
  return rule.activity === 'gym' ? 'gym' : null;
}
/** What a confirmed gym check-in grants: the rest of the window, time counting, or presence. */
export function gymUnlockSubline(rule: Rule | undefined, end: string) {
  if (rule?.mode.kind === 'target') return c.gym.detectedTime;
  if (rule?.mode.kind === 'state') return c.gym.detectedWhileHere;
  return c.gym.detectedUntil(end);
}
