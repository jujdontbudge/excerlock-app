import { Profile } from '../domain/types';
import { createPersistedStore } from './createPersistedStore';
import * as v from './validation';
export const defaultUnits = Intl.DateTimeFormat().resolvedOptions().locale.endsWith('-US') ? 'mi' : 'km';
export const profileStore = createPersistedStore<Profile>(
  'profile',
  {
    warmupRating: null,
    name: '',
    referralSource: '',
    ageBand: '',
    occupation: '',
    improveFirst: 'exercise',
    mainReason: '',
    estimatedDailyMinutes: 180,
    units: defaultUnits,
    walkPlaces: ['outside'],
  },
  {
    warmupRating: (value) =>
      value === null || (typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5),
    name: v.text,
    referralSource: v.text,
    ageBand: v.text,
    occupation: v.text,
    improveFirst: v.oneOf(['exercise', 'screenTime', 'wellness']),
    mainReason: v.text,
    estimatedDailyMinutes: v.number(0, 1440),
    units: v.units,
    walkPlaces: v.array(v.oneOf(['treadmill', 'outside'])),
  },
);
