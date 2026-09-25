import { RuleDay, GymPresence } from '../domain/types';
import { createPersistedStore } from './createPersistedStore';
import * as v from './validation';
const validDayRow = (row: unknown): row is RuleDay => v.ruleDay(row);
export const ruleDaysStore = createPersistedStore<{ days: RuleDay[]; gymPresence: GymPresence | null }>(
  'ruleDays',
  { days: [], gymPresence: null },
  { days: (value): value is RuleDay[] => Array.isArray(value), gymPresence: v.gymPresence },
  {
    sanitize: (value) => {
      if (!Array.isArray(value.days)) return value;
      return { days: value.days.filter(validDayRow), gymPresence: value.gymPresence };
    },
  },
);
