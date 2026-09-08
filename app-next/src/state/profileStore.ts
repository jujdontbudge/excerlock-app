import { Profile } from '../domain/types';
import { defineStore } from './createPersistedStore';
import * as v from './validation';
export const defaultUnits = Intl.DateTimeFormat().resolvedOptions().locale.endsWith('-US') ? 'mi' : 'km';
export const profileStore = defineStore<Profile>({
  name: 'profile',
  initial: {
    warmupRating: null,
    name: '',
    referralSource: '',
    ageBand: '',
    occupation: '',
    improveFirst: 'exercise',
    mainReason: '',
    estimatedDailyMinutes: 180,
    units: defaultUnits,
  },
  schemaVersion: 1,
  migrations: { 0: (raw) => raw },
  validators: {
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
  },
});
