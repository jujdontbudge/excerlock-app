import { GymVisit } from '../domain/types';
import { defineStore } from './createPersistedStore';
import * as v from './validation';

export const gymVisitsStore = defineStore<{ visits: GymVisit[] }>({
  name: 'gymVisits',
  initial: { visits: [] },
  schemaVersion: 1,
  migrations: { 0: (raw) => raw },
  validators: { visits: v.arrayOf(v.gymVisit) },
});
