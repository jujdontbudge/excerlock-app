import { RuleDay, WalkingSession } from '../domain/types';
import { createPersistedStore } from './createPersistedStore';
import * as v from './validation';
export const ruleDaysStore = createPersistedStore<{ days: RuleDay[]; walkingSession: WalkingSession | null }>(
  'ruleDays',
  { days: [], walkingSession: null },
  { days: v.array(v.ruleDay), walkingSession: v.walkingSession },
);
