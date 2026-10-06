import { createPersistedStore } from '../persistence/createPersistedStore';
import type { Activity } from '../model/types';

export const analyticsPreferencesStore = createPersistedStore<{ activity: Activity | null }>(
  'analytics-preferences',
  { activity: null },
  { activity: (value) => value === null || value === 'walking' || value === 'gym' },
);
