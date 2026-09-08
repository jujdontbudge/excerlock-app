import { localInstant } from '../../domain/calendar';
import { DayKey } from '../../domain/types';
import { distanceMetres } from '../../features/gym-picker/geometry';
import { ClockPort } from '../../ports/ClockPort';
import { Coordinates, PlaceSearch } from '../../ports/PlaceSearch';
import { SavedPlace, Unsubscribe } from '../../ports/models';
import { settingsStore } from '../../state/settingsStore';
import { GeofenceRegion, GymLocationEngine, RegionTransition } from '../engine/contracts';
import { recordLocation } from '../permissions';
import { VISIT_CONFIRM_MS } from '../pending/gymDwell';
import { GymPort, GymVisit } from '../pending/types';
import { VisitLog, memoryVisitLog } from './visitLog';

/** iOS monitors 20 regions per app; the product caps saved gyms far below that. */
export const MAX_SAVED_GYMS = 5;
export const GYM_RADIUS_METERS = { default: 100, min: 50, max: 200 } as const;

export type GymAdapterDependencies = {
  clock: ClockPort;
  engine: GymLocationEngine;
  /** Apple Maps discovery. Defaults to the local `ExpoLocalSearch` module in the composition root. */
  search: PlaceSearch;
  visitLog?: VisitLog;
  /** Confirmed arrivals the geofence task recorded while the app was closed (decision B31). */
  backgroundVisits?: () => Promise<GymVisit[]>;
  onError?: (error: unknown) => void;
};

export type GymAdapter = GymPort & {
  /** Restores a previous opt-in without prompting, and claims what the background task recorded. */
  reconcile(): Promise<void>;
  dispose(): void;
};

const clampRadius = (metres: number) =>
  Math.min(GYM_RADIUS_METERS.max, Math.max(GYM_RADIUS_METERS.min, Math.round((metres || GYM_RADIUS_METERS.default) / 10) * 10));

const regionOf = (place: SavedPlace): GeofenceRegion => ({
  id: place.id,
  latitude: place.latitude,
  longitude: place.longitude,
  radiusMeters: clampRadius(place.radiusMeters),
});

/**
 * Saved gyms, presence and visits.
 *
 * Two tiers, and the line between them is a permission boundary the tests police: manual check-in
 * runs on When-in-use, and `enableAutoDetect` is the only method in this file that may ask for
 * Always. Everything else — saving a place, checking in, reading a distance — stops at When-in-use.
 *
 * Visits are pairs of instants, never a running total. An hour in the locker room with the app
 * killed is credited in full because the geofence task recorded the enter and the exit, and
 * `domain/gymDwell` does the arithmetic when someone asks.
 */
export function createGymAdapter({
  clock,
  engine,
  search,
  visitLog = memoryVisitLog(),
  backgroundVisits,
  onError = () => undefined,
}: GymAdapterDependencies): GymAdapter {
  const presenceListeners = new Set<(presence: 'inside' | 'outside') => void>();
  const locationListeners = new Set<(location: Coordinates | null) => void>();
  const inside = new Map<string, boolean>();
  let monitoring = false;
  let manualFor: string | null = null;
  let presence: 'inside' | 'outside' = 'outside';

  const places = () => settingsStore.getState().data.gymPlaces;
  const saved = (placeId: string) => places().find((place) => place.id === placeId);

  const lastLocation = (): Coordinates | null => {
    const sample = engine.getLastLocation();
    return sample ? { latitude: sample.lat, longitude: sample.lon } : null;
  };

  const publishPresence = () => {
    const next = [...inside.values()].some(Boolean) ? 'inside' : 'outside';
    if (next === presence) return;
    presence = next;
    presenceListeners.forEach((listener) => listener(presence));
  };

  const openVisit = (placeId: string, source: GymVisit['source'], atMs: number) => {
    const visits = visitLog.read();
    const open = visits.find((visit) => visit.placeId === placeId && visit.exitedAt === null);
    if (open) return open;
    const enteredAt = new Date(atMs).toISOString();
    const visit: GymVisit = {
      id: `${source}:${placeId}:${enteredAt}:${visits.length}`,
      placeId,
      enteredAt,
      exitedAt: null,
      source,
    };
    visitLog.write([...visits, visit]);
    return visit;
  };

  const closeVisit = (placeId: string, atMs: number) => {
    const exitedAt = new Date(atMs).toISOString();
    const visits = visitLog.read();
    const next = visits.map((visit) =>
      visit.placeId === placeId && visit.exitedAt === null ? { ...visit, exitedAt } : visit,
    );
    if (next.some((visit, index) => visit !== visits[index])) visitLog.write(next);
  };

  const onTransition = (transition: RegionTransition) => {
    if (!saved(transition.regionId)) return;
    inside.set(transition.regionId, transition.type === 'enter');
    if (transition.type !== 'enter') closeVisit(transition.regionId, transition.atMs);
    // A transition arrives either from a monitored geofence or from the fix a manual check-in took.
    // Nothing else may open a visit: walking past a saved gym is not an arrival.
    else if (manualFor === transition.regionId) openVisit(transition.regionId, 'manual', transition.atMs);
    else if (monitoring) openVisit(transition.regionId, 'geofence', transition.atMs);
    publishPresence();
  };

  /**
   * Foreground presence, the When-in-use half. A location fix can close a visit but never opens
   * one. Without Always there is no exit event, so an open manual visit would otherwise run until
   * local midnight; this is the best a foreground app can do, and P2-T11 measures it on hardware.
   */
  const onLocation = (point: Coordinates) => {
    for (const place of places()) {
      const within = distanceMetres(point, place) <= clampRadius(place.radiusMeters);
      if (inside.get(place.id) === within) continue;
      inside.set(place.id, within);
      if (!within) closeVisit(place.id, Date.parse(clock.now()));
    }
    publishPresence();
  };

  const stopRegions = engine.on('region', onTransition);
  const stopLocation = engine.on('location', (sample) => {
    const point = { latitude: sample.lat, longitude: sample.lon };
    onLocation(point);
    locationListeners.forEach((listener) => listener(point));
  });
  const stopAuthorization = engine.on('authorization', (status) => recordLocation(status));

  const monitoredRegions = () => places().map(regionOf).slice(0, MAX_SAVED_GYMS);

  const remonitor = async () => {
    if (!monitoring) return;
    const regions = monitoredRegions();
    if (regions.length === 0) {
      await engine.stopMonitoringRegions();
      monitoring = false;
      return;
    }
    await engine.startMonitoringRegions(regions);
  };

  /** Fold what the background geofence task recorded into the log, newest wins on the same id. */
  const claimBackgroundVisits = async () => {
    if (!backgroundVisits) return;
    try {
      const claimed = await backgroundVisits();
      if (claimed.length === 0) return;
      const known = new Map(visitLog.read().map((visit) => [visit.id, visit]));
      for (const visit of claimed) known.set(visit.id, visit);
      visitLog.write([...known.values()].sort((a, b) => Date.parse(a.enteredAt) - Date.parse(b.enteredAt)));
    } catch (error) {
      onError(error);
    }
  };

  return {
    ...search,
    /** When-in-use only. Always is reachable through `enableAutoDetect` and nowhere else. */
    requestLocation: async () => recordLocation(await engine.requestAuthorization()),

    searchPlaces: async (query) => {
      const suggestions = await search.suggest(query, lastLocation() ?? undefined);
      const candidates = await Promise.all(suggestions.map((suggestion) => search.resolve(suggestion)));
      return candidates.map((candidate) => ({ ...candidate, radiusMeters: GYM_RADIUS_METERS.default }));
    },

    savePlace: async (place) => {
      if (!place.name.trim()) throw new Error('GYM_NAME_REQUIRED');
      const existing = places();
      if (existing.length >= MAX_SAVED_GYMS && !existing.some((candidate) => candidate.id === place.id)) {
        throw new Error('GYM_LIMIT_REACHED');
      }
      settingsStore.getState().patch({
        gymPlaces: [
          ...existing.filter((candidate) => candidate.id !== place.id),
          { ...place, name: place.name.trim(), radiusMeters: clampRadius(place.radiusMeters) },
        ],
      });
      await remonitor();
    },

    listPlaces: places,

    distanceTo: (placeId) => {
      const place = saved(placeId);
      const current = lastLocation();
      return place && current ? distanceMetres(current, place) : null;
    },

    visits: async (sinceDay: DayKey) => {
      const since = Date.parse(String(localInstant(sinceDay, 0, clock.timezone())));
      return visitLog
        .read()
        .filter((visit) => Date.parse(visit.exitedAt ?? clock.now()) >= since);
    },

    observeVisits: (callback) => {
      callback(visitLog.read());
      return visitLog.subscribe(callback);
    },

    checkIn: async (placeId, confirmation) => {
      const place = saved(placeId);
      if (!place) throw new Error('GYM_NOT_FOUND');
      manualFor = placeId;
      let confirmed: boolean;
      try {
        confirmed = await engine.checkIn(regionOf(place));
      } finally {
        manualFor = null;
      }
      recordLocation(engine.getAuthorizationStatus());
      if (!confirmed) throw new Error('OUTSIDE_SAVED_GYM');
      // Presence comes from the fix the engine just took, never from the fact that a check-in was
      // asked for: the user may have walked out while it was being taken.
      const fix = lastLocation();
      if (fix) onLocation(fix);
      else {
        inside.set(placeId, true);
        publishPresence();
      }
      // The confirmed geofence transition for a manual check-in only arrives thirty seconds later,
      // so the visit is opened here and deduplicated when it does.
      const visit = openVisit(placeId, 'manual', Date.parse(clock.now()));
      if (confirmation) await holdConfirmation(visit, confirmation);
      return visitLog.read().find((candidate) => candidate.id === visit.id) ?? visit;
    },

    /**
     * The only path to Always. `startMonitoringRegions` escalates When-in-use to Always inside the
     * engine and throws if the user declines, which is why nothing else calls it.
     */
    enableAutoDetect: async () => {
      const regions = monitoredRegions();
      if (regions.length === 0) return false;
      try {
        await engine.startMonitoringRegions(regions);
      } catch (error) {
        onError(error);
        recordLocation(engine.getAuthorizationStatus());
        return false;
      }
      monitoring = true;
      recordLocation(engine.getAuthorizationStatus());
      settingsStore.getState().patch({ gymAutoDetect: true });
      return true;
    },

    disableAutoDetect: () => {
      settingsStore.getState().patch({ gymAutoDetect: false });
      if (!monitoring) return;
      monitoring = false;
      void engine.stopMonitoringRegions().catch(onError);
    },

    observePresence: (callback) => {
      presenceListeners.add(callback);
      callback(presence);
      return () => presenceListeners.delete(callback);
    },

    observeLocation: (callback) => {
      locationListeners.add(callback);
      callback(lastLocation());
      return () => locationListeners.delete(callback);
    },

    reconcile: async () => {
      await claimBackgroundVisits();
      recordLocation(engine.getAuthorizationStatus());
      if (!settingsStore.getState().data.gymAutoDetect) {
        if (monitoring) {
          monitoring = false;
          await engine.stopMonitoringRegions().catch(onError);
        }
        return;
      }
      // A missing Always grant is a quiet no-op; only enableAutoDetect may cross that boundary.
      if (engine.getAuthorizationStatus() !== 'authorizedAlways') return;
      const regions = monitoredRegions();
      if (regions.length === 0) return;
      monitoring = true;
      await engine.startMonitoringRegions(regions).catch((error) => {
        monitoring = false;
        onError(error);
      });
    },

    dispose: () => {
      stopRegions();
      stopLocation();
      stopAuthorization();
      presenceListeners.clear();
      locationListeners.clear();
    },
  };

  /**
   * The arrival ring. The visit is already open, so a cancelled confirmation still leaves an
   * interval too short for `gymDwell` to count rather than a hole in the record.
   */
  function holdConfirmation(
    visit: GymVisit,
    confirmation: { milliseconds: number; signal: AbortSignal },
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      let settled = false;
      // A deadline already in the past resolves during registration, so the teardown handles have
      // to exist before anything can arm them.
      const release: Unsubscribe[] = [];
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        release.splice(0).forEach((stop) => stop());
        confirmation.signal.removeEventListener('abort', abort);
        if (!error) return resolve();
        closeVisit(visit.placeId, Date.parse(clock.now()));
        reject(error);
      };
      const abort = () => finish(new Error('CHECK_IN_CANCELLED'));
      const leaving = (value: 'inside' | 'outside') => {
        if (value === 'outside') finish(new Error('LEFT_GYM'));
      };
      presenceListeners.add(leaving);
      release.push(() => presenceListeners.delete(leaving));
      confirmation.signal.addEventListener('abort', abort);
      if (confirmation.signal.aborted) return abort();
      // The user may already have walked out while the fix was being taken. Presence is state, so
      // read it once rather than waiting for a change that has already happened.
      if (presence === 'outside') return leaving('outside');

      const deadline = new Date(
        Date.parse(visit.enteredAt) + Math.max(confirmation.milliseconds, VISIT_CONFIRM_MS),
      ).toISOString();
      const stopDeadline = clock.at(deadline, () => finish());
      if (settled) stopDeadline();
      else release.push(stopDeadline);
    });
  }
}
