import { GymVisit } from '../domain/types';
import { createPersistedStore } from './createPersistedStore';
import * as v from './validation';

const gymVisit = v.shape({
  id: v.text,
  placeId: v.text,
  enteredAt: v.iso,
  exitedAt: v.nullable(v.iso),
  source: v.oneOf(['geofence', 'manual']),
});

export const gymVisitsStore = createPersistedStore<{ visits: GymVisit[] }>(
  'gymVisits',
  { visits: [] },
  { visits: v.array(gymVisit) },
);
