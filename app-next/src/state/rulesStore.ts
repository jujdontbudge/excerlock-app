import { Rule, LockedApps } from '../domain/types';
import { validateRule } from '../domain/validateRule';
import { createPersistedStore } from './createPersistedStore';
import * as v from './validation';
/**
 * One-line note set when hydration retires running/biking rules (B38). The Conditions
 * screen shows it until dismissed; dismissing clears it forever. The native HealthKit
 * capability stays compiled for a future OTA return (owned by the native porter), but no
 * JavaScript path reads it, so retired rows can never come back on their own.
 */
export const rulesRetirementNote =
  'Running and biking conditions were removed; your walking and gym conditions are unchanged.';
const activityOf = (row: unknown): unknown => {
  if (typeof row !== 'object' || row === null) return undefined;
  const activity = (row as { activity?: unknown }).activity;
  if (typeof activity === 'string') return activity;
  const mode = (row as { mode?: unknown }).mode;
  if (typeof mode !== 'object' || mode === null) return undefined;
  return (mode as { activity?: unknown }).activity;
};
// Allow-list based so the detector never needs to name retired activities: in practice
// these are the running/biking rows stored before B38, which validateRule now rejects.
const retiredActivity = (row: unknown): boolean => {
  const activity = activityOf(row);
  return typeof activity === 'string' && !['walking', 'gym'].includes(activity);
};
const validRuleRow = (row: unknown): row is Rule => validateRule(row).length === 0;
export type RulesData = { rules: Rule[]; lockedApps: LockedApps; migrationNote: string | null };
export const rulesStore = createPersistedStore<RulesData>(
  'rules',
  { rules: [], lockedApps: { handle: null, isEmpty: true }, migrationNote: null },
  {
    rules: (value): value is Rule[] => Array.isArray(value),
    lockedApps: v.lockedApps,
    migrationNote: v.nullable(v.text),
  },
  {
    sanitize: (value) => {
      if (!Array.isArray(value.rules)) return value;
      return { ...value, rules: value.rules.filter(validRuleRow) };
    },
    migrate: (persisted) => {
      if (typeof persisted !== 'object' || persisted === null) return persisted;
      const data = persisted as { rules?: unknown; migrationNote?: unknown };
      if (!Array.isArray(data.rules) || !data.rules.some(retiredActivity)) return persisted;
      const note =
        typeof data.migrationNote === 'string' && data.migrationNote ? data.migrationNote : rulesRetirementNote;
      return { ...persisted, migrationNote: note };
    },
  },
);
