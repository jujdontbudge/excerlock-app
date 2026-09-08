import { Rule, LockedApps } from '../domain/types';
import { validateRule } from '../domain/validateRule';
import { migrateRule } from '../domain/migrateRule';
import { createPersistedStore } from './createPersistedStore';
import * as v from './validation';
export const rulesStore = createPersistedStore<{ rules: Rule[]; lockedApps: LockedApps }>(
  'rules',
  { rules: [], lockedApps: { handle: null, appCount: 0, categoryCount: 0 } },
  { rules: v.array((r) => validateRule(r).length === 0), lockedApps: v.lockedApps },
  // merge: replace with P2-T13's migration table; P2-T14's window widening folds into the same entry.
  (persisted) =>
    v.object(persisted) && Array.isArray(persisted.rules)
      ? { ...persisted, rules: persisted.rules.map(migrateRule) }
      : persisted,
);
