import type { GymPort } from '../../ports/GymPort';
import type { SavedPlace } from '../../ports/models';
import type { Coordinates } from '../../ports/PlaceSearch';
import type { AppLocationProvider } from '../../engine/signals/location/ManualGymCheckIn';
import { settingsStore } from '../../state/settingsStore';
import { nativePlaceSearch } from '../NativePlaceSearch';
import { distanceMetres } from '../../features/gym-picker/geometry';

export type NativeGymOwner = Readonly<{
  location: AppLocationProvider;
  registerGyms(places: readonly SavedPlace[]): Promise<void>;
  deleteGym(id: string): Promise<void>;
}>;
export type NativeGymPort = GymPort & { deletePlace(id: string): Promise<void>; authorizationStatus(): ReturnType<AppLocationProvider['getAuthorizationStatus']> };
const permission = (s: ReturnType<AppLocationProvider['getAuthorizationStatus']>) => s === 'authorizedAlways' ? 'always' : s === 'authorizedWhenInUse' ? 'whenInUse' : s === 'denied' || s === 'restricted' ? 'denied' : 'notDetermined';

/** Shares the detection factory's one LocationProvider; never registers tasks or owns an AwakeSession. */
export function createNativeGymPort(owner: NativeGymOwner): NativeGymPort {
  let mutations: Promise<void> = Promise.resolve();
  const serialize = <T>(work: () => Promise<T>): Promise<T> => { const next = mutations.then(work, work); mutations = next.then(() => undefined, () => undefined); return next; };
  const location = owner.location;
  const places = () => settingsStore.getState().data.gymPlaces;
  const persist = (gymPlaces: SavedPlace[], gymAutoDetect = settingsStore.getState().data.gymAutoDetect) => settingsStore.getState().patch({ gymPlaces, gymAutoDetect });
  const presence = () => places().some(p => location.isInsideRegion(p.id) === true) ? 'inside' as const : 'outside' as const;
  return {
    ...nativePlaceSearch,
    searchPlaces: async query => {
      const near = location.getLastLocation();
      const suggestions = await nativePlaceSearch.suggest(query, near ? { latitude: near.lat, longitude: near.lon } : undefined);
      return Promise.all(suggestions.slice(0, 5).map(async s => { const p = await nativePlaceSearch.resolve(s); return { id: p.id, name: p.name, address: p.address, latitude: p.latitude, longitude: p.longitude, radiusMeters: 150 }; }));
    },
    authorizationStatus: () => location.getAuthorizationStatus(),
    requestLocation: async () => permission(await location.requestAuthorization()),
    savePlace: place => serialize(async () => {
      const old = places();
      const next = [...places().filter(p => p.id !== place.id), place];
      if (next.length > 5) throw new Error('At most five saved gyms are supported');
      persist(next);
      if (settingsStore.getState().data.gymAutoDetect) { try { await owner.registerGyms(next); } catch(error) { persist(old, false); throw error; } }
    }),
    deletePlace: id => serialize(async () => { await owner.deleteGym(id); persist(places().filter(p => p.id !== id)); }),
    listPlaces: () => [...places()],
    enableAutoDetect: async () => {
      try { await owner.registerGyms(places()); const enabled = location.getAuthorizationStatus() === 'authorizedAlways'; persist(places(), enabled); return enabled; }
      catch { persist(places(), false); return false; }
    },
    disableAutoDetect: () => serialize(async () => { await location.stopMonitoringRegions(); persist(places(), false); }),
    checkIn: async id => {
      const place = places().find(p => p.id === id); if (!place) throw new Error('Saved gym not found');
      const inside = await location.checkIn({ id, latitude: place.latitude, longitude: place.longitude, radiusMeters: place.radiusMeters });
      if (!inside) throw new Error('Outside saved gym');
    },
    // Unknown native coverage maps to outside only for this legacy UI port; it never grants confirmed relief.
    observePresence: callback => { callback(presence()); return location.on('region', () => callback(presence())); },
    observeLocation: callback => { const current = location.getLastLocation(); callback(current ? { latitude: current.lat, longitude: current.lon } : null); return location.on('location', sample => callback({ latitude: sample.lat, longitude: sample.lon })); },
    distanceTo: id => { const p = places().find(x => x.id === id), l = location.getLastLocation(); return p && l ? distanceMetres({ latitude: l.lat, longitude: l.lon }, p) : null; },
  };
}
