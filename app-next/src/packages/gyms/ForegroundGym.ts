import { GymPort, GymLocationFix } from '../ports/GymPort';
import { Coordinates } from '../ports/PlaceSearch';
import { nativePlaceSearch, requestNativeLocation } from './NativePlaceSearch';
import { distanceMetres } from './geometry';
export function foregroundGym(base: GymPort, presenceChanged: (value: 'inside' | 'outside') => void, readFix?: () => Promise<GymLocationFix | null>): GymPort {
  let fix: GymLocationFix | null = null;
  let last: Coordinates | null = null,
    presence: 'inside' | 'outside' = 'outside';
  let timer: ReturnType<typeof setInterval> | undefined,
    pending = false;
  const locations = new Set<(point: Coordinates | null) => void>();
  const presences = new Set<(value: 'inside' | 'outside') => void>();
  const publish = (point: Coordinates | null) => {
    last = point;
    const next =
      point && base.listPlaces().some((place) => distanceMetres(point, place) <= place.radiusMeters)
        ? 'inside'
        : 'outside';
    locations.forEach((cb) => cb(point));
    if (next !== presence) {
      presence = next;
      presenceChanged(next);
      presences.forEach((cb) => cb(next));
    }
  };
  const sample = async (request = false) => {
    fix = readFix ? await readFix() : await base.currentFix(request);
    const point = fix;
    publish(point);
    return point;
  };
  const begin = () => {
    if (timer) return;
    timer = setInterval(async () => {
      if (pending) return;
      pending = true;
      try {
        await sample();
      } catch {
        publish(null);
      } finally {
        pending = false;
      }
    }, 3000);
  };
  const stop = () => {
    if (!locations.size && !presences.size && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
  return {
    ...base,
    ...nativePlaceSearch,
    requestLocation: requestNativeLocation,
    currentLocation: sample,
    currentFix: async () => { await sample(); return fix; },
    lastKnownLocation: () => last,
    distanceTo: (id) => {
      const place = base.listPlaces().find((p) => p.id === id);
      return last && place ? distanceMetres(last, place) : null;
    },
    observeLocation: (cb) => {
      locations.add(cb);
      cb(last);
      begin();
      return () => {
        locations.delete(cb);
        stop();
      };
    },
    observePresence: (cb) => {
      presences.add(cb);
      cb(presence);
      begin();
      return () => {
        presences.delete(cb);
        stop();
      };
    },
    checkIn: async (id, confirmation) => {
      await sample();
      if (presence !== 'inside') throw new Error('Outside saved gym');
      presenceChanged('inside');
      await base.checkIn(id, confirmation);
    },
  };
}
