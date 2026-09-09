import { RuleDay, WalkingSession, GymPresence } from '../domain/types';
import { createPersistedStore } from './createPersistedStore';
import * as v from './validation';
export const ruleDaysStore = createPersistedStore<{
  days: RuleDay[];
  walkingSession: WalkingSession | null;
  gymPresence: GymPresence | null;
}>(
  'ruleDays',
  { days: [], walkingSession: null, gymPresence: null },
  { days: v.array(v.ruleDay), walkingSession: v.walkingSession, gymPresence: v.gymPresence },
);
