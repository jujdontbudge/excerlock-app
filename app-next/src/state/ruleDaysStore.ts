import { EarnedUnlock, RuleDay, WalkingSession } from '../domain/types';
import { createPersistedStore } from './createPersistedStore';
import * as v from './validation';
export const ruleDaysStore = createPersistedStore<{
  days: RuleDay[];
  earnedUnlocks: EarnedUnlock[];
  walkingSession: WalkingSession | null;
}>(
  'ruleDays',
  { days: [], earnedUnlocks: [], walkingSession: null },
  { days: v.array(v.ruleDay), earnedUnlocks: v.array(v.earnedUnlock), walkingSession: v.walkingSession },
);
