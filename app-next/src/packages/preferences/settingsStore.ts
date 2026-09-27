import { SavedPlace } from '../model/models';
import { createPersistedStore } from '../persistence/createPersistedStore';
import { defaultUnits } from './profileStore';
import * as v from '../persistence/validation';
import { setHapticsEnabled } from '../ui/haptics';
export type Settings = {
  gymPlaces: SavedPlace[];
  units: 'km' | 'mi';
  stopGrace: number;
  gymAutoDetect: boolean;
  haptics: boolean;
  analyticsEnabled: boolean;
  notificationsEnabled: boolean;
};
export const settingsStore = createPersistedStore<Settings>(
  'settings',
  { gymPlaces: [], units: defaultUnits, stopGrace: 30, gymAutoDetect: false, haptics: true, analyticsEnabled: true, notificationsEnabled: true },
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
    analyticsEnabled: v.bool,
    notificationsEnabled: v.bool,
  },
);
setHapticsEnabled(settingsStore.getState().data.haptics);
settingsStore.subscribe((state) => setHapticsEnabled(state.data.haptics));
