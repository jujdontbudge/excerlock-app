import { RuleDay, WalkingSession } from '../domain/types';
import { defineStore } from './createPersistedStore';
import * as v from './validation';
export const ruleDaysStore = defineStore<{ days: RuleDay[]; walkingSession: WalkingSession | null }>({
  name: 'ruleDays',
  initial: { days: [], walkingSession: null },
  schemaVersion: 1,
  migrations: { 0: (raw) => raw },
  validators: { days: v.arrayOf(v.ruleDay), walkingSession: v.walkingSession },
});
