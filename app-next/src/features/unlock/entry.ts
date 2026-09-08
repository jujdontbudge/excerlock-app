import { Rule } from '../../domain/types';
export type UnlockEntryKind = 'gym' | 'treadmill' | 'handheld';

/** The ceremony pills a rule can open from Home, in the order they are offered. */
export function unlockEntries(rule: Rule): UnlockEntryKind[] {
  const mode = rule.mode;
  if (mode.activity === 'gym') return ['gym'];
  // A steps goal is counted by the pedometer alone; a session rule or a minutes goal opens a ceremony.
  if (mode.activity !== 'walking' || (mode.kind === 'target' && mode.metric === 'steps')) return [];
  if (mode.place === 'treadmill') return ['treadmill'];
  if (mode.place === 'either') return ['treadmill', 'handheld'];
  return ['handheld'];
}
