import { HistoryDay } from '../ports/models';
import { defineStore } from './createPersistedStore';
import * as v from './validation';

export const historyStore = defineStore<{ days: HistoryDay[] }>({
  name: 'history',
  initial: { days: [] },
  schemaVersion: 1,
  migrations: { 0: (raw) => raw },
  validators: { days: v.arrayOf(v.historyDay) },
});
