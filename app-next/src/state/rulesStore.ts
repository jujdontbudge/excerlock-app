import { Rule, LockedApps } from '../domain/types';
import { validateRule } from '../domain/validateRule';
import { defineStore } from './createPersistedStore';
import * as v from './validation';
export const rulesStore = defineStore<{ rules: Rule[]; lockedApps: LockedApps }>({
  name: 'rules',
  initial: { rules: [], lockedApps: { handle: null, appCount: 0, categoryCount: 0 } },
  schemaVersion: 1,
  migrations: { 0: (raw) => raw },
  validators: { rules: v.arrayOf((r) => validateRule(r).length === 0), lockedApps: v.lockedApps },
});
