import { Rule, LockedApps } from '../domain/types';
import { migrateRule, validateRule } from '../domain/validateRule';
import { defineStore } from './createPersistedStore';
import * as v from './validation';
export const rulesStore = defineStore<{ rules: Rule[]; lockedApps: LockedApps }>({
  name: 'rules',
  initial: { rules: [], lockedApps: { handle: null, appCount: 0, categoryCount: 0 } },
  schemaVersion: 2,
  migrations: {
    0: (raw) => raw,
    // Widen persisted 15–29-minute windows to MIN_WINDOW_MINUTES instead of dropping the rule (audit #97).
    1: (raw) => widenRuleWindows(raw),
  },
  validators: { rules: v.arrayOf((r) => validateRule(r).length === 0), lockedApps: v.lockedApps },
});

function widenRuleWindows(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object' || !Array.isArray((raw as { rules?: unknown }).rules)) return raw;
  const { rules } = raw as { rules: unknown[] };
  return {
    ...(raw as object),
    rules: rules.map((r) => {
      try {
        return migrateRule(r as Rule);
      } catch {
        return r; // malformed row: leave it for validation to quarantine
      }
    }),
  };
}
