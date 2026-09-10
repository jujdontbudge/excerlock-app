import { RuleDay, WalkingSession, GymPresence } from '../domain/types';
import { createPersistedStore } from './createPersistedStore';
import * as v from './validation';
const validDayRow = (row: unknown): row is RuleDay => v.ruleDay(row);
export const ruleDaysStore = createPersistedStore<{
  days: RuleDay[];
  walkingSession: WalkingSession | null;
  gymPresence: GymPresence | null;
}>(
  'ruleDays',
  { days: [], walkingSession: null, gymPresence: null },
  {
    days: (value): value is RuleDay[] => Array.isArray(value),
    walkingSession: v.walkingSession,
    gymPresence: v.gymPresence,
  },
  {
    sanitize: (value) => {
      if (!Array.isArray(value.days)) return value;
      return { ...value, days: value.days.filter(validDayRow) };
    },
  },
);
