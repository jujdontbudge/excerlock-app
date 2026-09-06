import { Rule, LockedApps } from '../domain/types';
import { validateRule } from '../domain/validateRule';
import { createPersistedStore } from './createPersistedStore';
import * as v from './validation';
export const rulesStore = createPersistedStore<{ rules: Rule[]; lockedApps: LockedApps }>(
  'rules',
  { rules: [], lockedApps: { handle: null, appCount: 0, categoryCount: 0 } },
  { rules: v.array((r) => validateRule(r).length === 0), lockedApps: v.lockedApps },
);
