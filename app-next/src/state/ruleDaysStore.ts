import { EarnedUnlock, RuleDay, WalkingSession } from '../domain/types';
import { defineStore } from './createPersistedStore';
import * as v from './validation';
export const ruleDaysStore = defineStore<{
  days: RuleDay[];
  earnedUnlocks: EarnedUnlock[];
  walkingSession: WalkingSession | null;
}>({
  name: 'ruleDays',
  initial: { days: [], earnedUnlocks: [], walkingSession: null },
  schemaVersion: 1,
  migrations: { 0: (raw) => raw },
  validators: {
    days: v.arrayOf(v.ruleDay),
    earnedUnlocks: v.arrayOf(v.earnedUnlock),
    walkingSession: v.walkingSession,
  },
});
