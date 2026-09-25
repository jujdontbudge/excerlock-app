import { Profile } from '../model/types';
import { createPersistedStore } from '../persistence/createPersistedStore';
import * as v from '../persistence/validation';
export const defaultUnits = Intl.DateTimeFormat().resolvedOptions().locale.endsWith('-US') ? 'mi' : 'km';
export const profileStore = createPersistedStore<Profile>(
  'profile',
  {
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
