import { localInstant } from '../../domain/calendar';
import { GymVisit } from '../../domain/types';
import { GymPort } from '../../ports/GymPort';
import { gymVisitsStore } from '../../state/gymVisitsStore';
import { permissionsStore } from '../../state/permissionsStore';
import { settingsStore } from '../../state/settingsStore';
import { distanceMetres } from '../../features/gym-picker/geometry';
import { FakeContext } from '../FakeContext';
import { places } from '../places';

export function GymFake(ctx: FakeContext): GymPort & { dispose: () => void } {
  const list = () => settingsStore.getState().data.gymPlaces;
  const location = () => {
    const place = list()[0];
    return place
      ? {
          latitude: place.latitude + (ctx.snapshot().presence === 'outside' ? 140 / 111320 : 0),
          longitude: place.longitude,
        }
      : null;
  };
  const writeVisits = (visits: GymVisit[]) => gymVisitsStore.getState().patch({ visits });
  const openVisit = (placeId: string, source: GymVisit['source']) => {
    const visits = gymVisitsStore.getState().data.visits;
    const existing = visits.find((visit) => visit.placeId === placeId && visit.exitedAt === null);
    if (existing) return existing;
    const enteredAt = ctx.clock.now();
    const visit: GymVisit = {
      id: `${source}:${placeId}:${enteredAt}:${visits.length}`,
      placeId,
      enteredAt,
      exitedAt: null,
      source,
    };
    writeVisits([...visits, visit]);
    return visit;
  };
  const closeOpenVisits = () => {
    const at = ctx.clock.now();
    const visits = gymVisitsStore.getState().data.visits;
    const next = visits.map((visit) => (visit.exitedAt === null ? { ...visit, exitedAt: at } : visit));
    if (next.some((visit, index) => visit !== visits[index])) writeVisits(next);
  };
  let lastPresence = ctx.snapshot().presence;
  const stopPresenceWriter = ctx.subscribe(() => {
    const snapshot = ctx.snapshot();
    if (snapshot.loading || snapshot.presence === lastPresence) return;
    lastPresence = snapshot.presence;
    if (snapshot.presence === 'outside') closeOpenVisits();
    else if (
      settingsStore.getState().data.gymAutoDetect &&
      permissionsStore.getState().data.location === 'always' &&
      list()[0]
    ) {
      openVisit(list()[0].id, 'geofence');
    }
  });

  return {
    dispose: stopPresenceWriter,
    requestLocation: async () => {
      await ctx.request('location');
      return permissionsStore.getState().data.location;
    },
    searchPlaces: async (query) =>
      places.filter((place) =>
        `${place.name} ${place.address}`.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    suggest: async (query) =>
      places
        .filter((place) =>
          `${place.name} ${place.address}`.toLowerCase().includes(query.trim().toLowerCase()),
        )
        .map((place) => ({ id: place.id, title: place.name, subtitle: place.address })),
    resolve: async (suggestion) => {
      const place = places.find((candidate) => candidate.id === suggestion.id);
      if (!place) throw new Error('PLACE_NOT_FOUND');
      return { ...place, isGym: true };
    },
    nearbyGyms: async () => places.map((place) => ({ ...place, isGym: true })),
    reverseGeocode: async (coordinates) =>
      `${Math.abs(Math.round(coordinates.latitude * 10000)) % 900 + 100} Demo Street, ${coordinates.longitude.toFixed(4)}`,
    currentLocation: async (request = false) => {
      if (request) await ctx.request('location');
      const permission = permissionsStore.getState().data.location;
      return permission === 'whenInUse' || permission === 'always' ? location() : null;
    },
    savePlace: async (place) => {
      if (!place.name.trim()) throw new Error('GYM_NAME_REQUIRED');
      if (list().length >= 5 && !list().some((candidate) => candidate.id === place.id)) {
        throw new Error('GYM_LIMIT_REACHED');
      }
      settingsStore.getState().patch({
        gymPlaces: [
          ...list().filter((candidate) => candidate.id !== place.id),
          {
            ...place,
            name: place.name.trim(),
            radiusMeters: Math.min(200, Math.max(50, Math.round((place.radiusMeters || 100) / 10) * 10)),
          },
        ],
      });
      ctx.log('gym_saved', { id: place.id });
    },
    listPlaces: list,
    distanceTo: (id) => {
      const place = list().find((candidate) => candidate.id === id);
      const current = location();
      return place && current ? distanceMetres(place, current) : null;
    },
    observeLocation: (callback) => {
      callback(location());
      return ctx.subscribe(() => callback(location()));
    },
    visits: async (sinceDay) => {
      const boundary = localInstant(sinceDay, 0, ctx.clock.timezone());
      if (__DEV__ && !boundary.converged) throw new Error('LOCAL_MIDNIGHT_DID_NOT_CONVERGE');
      const since = Date.parse(boundary.instant);
      return gymVisitsStore
        .getState()
        .data.visits.filter((visit) => Date.parse(visit.exitedAt ?? ctx.clock.now()) >= since);
    },
    observeVisits: (callback) => {
      callback(gymVisitsStore.getState().data.visits);
      return gymVisitsStore.subscribe((state) => callback(state.data.visits));
    },
    checkIn: async (placeId, confirmation) => {
      ctx.result();
      if (ctx.snapshot().presence !== 'inside') throw new Error('OUTSIDE_SAVED_GYM');
      if (!list().some((place) => place.id === placeId)) throw new Error('GYM_NOT_FOUND');
      const visit = openVisit(placeId, 'manual');
      if (confirmation) {
        await new Promise<void>((resolve, reject) => {
          let complete = false;
          const finish = (error?: Error) => {
            if (complete) return;
            complete = true;
            stopDeadline();
            stopPresence();
            confirmation.signal.removeEventListener('abort', abort);
            if (error) reject(error);
            else resolve();
          };
          const abort = () => finish(new Error('CHECK_IN_CANCELLED'));
          const deadline = new Date(Date.parse(visit.enteredAt) + confirmation.milliseconds).toISOString();
          const stopDeadline = ctx.clock.at(deadline, () => finish());
          const stopPresence = ctx.subscribe(() => {
            if (ctx.snapshot().presence === 'outside') finish(new Error('LEFT_GYM'));
          });
          confirmation.signal.addEventListener('abort', abort);
          if (confirmation.signal.aborted) abort();
        });
      }
      return gymVisitsStore.getState().data.visits.find((candidate) => candidate.id === visit.id) ?? visit;
    },
    enableAutoDetect: async () => {
      const mode = ctx.snapshot().promptMode;
      const granted =
        mode === 'ask'
          ? (await ctx.prompt({ kind: 'permission', name: 'location', scope: 'always' })) === true
          : mode === 'grant';
      if (!granted) return false;
      permissionsStore.getState().patch({ location: 'always' });
      settingsStore.getState().patch({ gymAutoDetect: true });
      return true;
    },
    disableAutoDetect: () => settingsStore.getState().patch({ gymAutoDetect: false }),
    observePresence: (callback) => {
      let last = ctx.snapshot().presence;
      callback(last);
      return ctx.subscribe(() => {
        const next = ctx.snapshot().presence;
        if (last !== next) {
          last = next;
          callback(next);
        }
      });
    },
  };
}
