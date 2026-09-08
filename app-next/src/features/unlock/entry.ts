import { Rule } from '../../domain/types';
export type UnlockEntryKind = 'gym' | 'treadmill' | 'handheld';

export function unlockEntries(rule: Rule): UnlockEntryKind[] {
  if (rule.activity === 'gym' && (rule.mode.kind === 'event' || rule.mode.kind === 'target')) return ['gym'];
  const mode = rule.mode as Rule['mode'] & { metric?: string; place?: 'outside' | 'treadmill' | 'either' };
  // merge: P2-T16's walking-minutes RuleMode removes this structural compatibility check.
  const walkingEntry = rule.activity === 'walking' && (mode.kind === 'state' || mode.metric === 'minutes');
  if (!walkingEntry) return [];
  if (mode.place === 'treadmill') return ['treadmill'];
  if (mode.place === 'either') return ['treadmill', 'handheld'];
  return ['handheld'];
}
