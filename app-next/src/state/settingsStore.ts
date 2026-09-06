import { SavedPlace } from '../ports/models';
import { createPersistedStore } from './createPersistedStore';
import { defaultUnits } from './profileStore';
import * as v from './validation';
export type Settings = {
  gymPlaces: SavedPlace[];
  units: 'km' | 'mi';
  stopGrace: number;
  gymAutoDetect: boolean;
  haptics: boolean;
};
export const settingsStore = createPersistedStore<Settings>(
  'settings',
  { gymPlaces: [], units: defaultUnits, stopGrace: 30, gymAutoDetect: false, haptics: true },
  {
    gymPlaces: v.array(
      v.shape({
        id: v.text,
        name: v.text,
        address: v.text,
        latitude: v.number(-90, 90),
        longitude: v.number(-180, 180),
        radiusMeters: v.number(1, 10000),
      }),
    ),
    units: v.units,
    stopGrace: v.number(30, 300),
    gymAutoDetect: v.bool,
    haptics: v.bool,
  },
);
