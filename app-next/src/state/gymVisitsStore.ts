import { GymVisit } from '../domain/types';
import { defineStore } from './createPersistedStore';
import * as v from './validation';

const gymVisit = v.shape({
  id: v.text,
  placeId: v.text,
  enteredAt: v.iso,
  exitedAt: v.nullable(v.iso),
  source: v.oneOf(['geofence', 'manual']),
});

export const gymVisitsStore = defineStore<{ visits: GymVisit[] }>({
  name: 'gymVisits',
  initial: { visits: [] },
  schemaVersion: 1,
  migrations: { 0: (raw) => raw },
  validators: { visits: v.arrayOf(gymVisit) },
});
