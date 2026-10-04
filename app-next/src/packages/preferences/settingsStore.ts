import { SavedPlace } from '../model/models';
import { createPersistedStore } from '../persistence/createPersistedStore';
import { defaultUnits } from './profileStore';
import * as v from '../persistence/validation';
import { setHapticsEnabled } from '../ui/haptics';
export type Settings = {
  locationAlwaysAsked: boolean;
  gymBackgroundAsked: boolean;
  gymAutoDetectOptOut: boolean;
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
  { gymBackgroundAsked: false, gymAutoDetectOptOut: false, locationAlwaysAsked: false, gymPlaces: [], units: defaultUnits, stopGrace: 30, gymAutoDetect: false, haptics: true, analyticsEnabled: true, notificationsEnabled: true },
  {
    locationAlwaysAsked: v.bool,
    gymBackgroundAsked: v.bool,
    gymAutoDetectOptOut: v.bool,
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
  { migrate: (value) => {
    if (!value || typeof value !== 'object') return value;
    const previous = value as Partial<Settings>;
    const previouslyAsked = previous.locationAlwaysAsked === true && previous.gymAutoDetect !== true;
    return { ...previous, gymBackgroundAsked: previous.gymBackgroundAsked ?? previouslyAsked, gymAutoDetectOptOut: previous.gymAutoDetectOptOut ?? previouslyAsked };
  } },
);
setHapticsEnabled(settingsStore.getState().data.haptics);
settingsStore.subscribe((state) => setHapticsEnabled(state.data.haptics));
