import { HistoryDay } from '../ports/models';
import { createPersistedStore } from './createPersistedStore';
import * as v from './validation';

const historyDay = (value: unknown) =>
  v.object(value) &&
  v.shape({
    day: v.text,
    usageMinutes: v.nullable(v.number()),
    activity: v.shape({ walking: v.number(), gym: v.number(), running: v.number(), biking: v.number() }),
    met: v.bool,
    scheduled: v.bool,
  })(value) &&
  (value.sealedAt === undefined || v.iso(value.sealedAt));

export const historyStore = createPersistedStore<{ days: HistoryDay[] }>(
  'history',
  { days: [] },
  { days: v.array(historyDay) },
);
