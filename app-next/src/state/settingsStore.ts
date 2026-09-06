import { createPersistedStore } from './createPersistedStore';
import { defaultUnits } from './profileStore';
import * as v from './validation';
export type Settings = { units: 'km' | 'mi'; stopGrace: number; gymAutoDetect: boolean; haptics: boolean };
export const settingsStore = createPersistedStore<Settings>(
  'settings',
  { units: defaultUnits, stopGrace: 30, gymAutoDetect: false, haptics: true },
  { units: v.units, stopGrace: v.number(30, 300), gymAutoDetect: v.bool, haptics: v.bool },
);
