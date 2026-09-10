import type { HistoryArchive } from '../domain/sealDay';
import { createPersistedStore } from './createPersistedStore';
import * as v from './validation';
const day = (value: unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && v.iso(value);
const row = v.shape({
  day,
  sealedAt: v.iso,
  usageMinutes: v.nullable(v.number()),
  activity: v.shape({ walking: v.number(), gym: v.number() }),
  met: v.bool,
  scheduled: v.bool,
});
export const historyStore = createPersistedStore<HistoryArchive>(
  'history',
  { startedDay: null, days: [] },
  { startedDay: v.nullable(day), days: v.array(row) },
);
