import { projectGymProgress } from '../gymProgress';
import type { GymPort, GymLocationFix } from '../../../ports/GymPort';
import { permissionsStore } from '../../../permissions/permissionsStore';
import { settingsStore } from '../../../preferences/settingsStore';
import { rulesStore } from '../../../conditions/rulesStore';
import { ruleDaysStore } from '../../../conditions/ruleDaysStore';
import { GeofenceEventProcessor } from '../../../activity/GymVisitProcessor';
import { AsyncStorageGymVisitLog, gymVisitLogEpoch, resumeGymVisitLogWrites, suspendGymVisitLogWritesAndReset } from '../../../activity/AsyncStorageGymVisitLog';
import { confirmGymCheckIn } from '../../../activity/GymCheckIn';
import { createGymState, reduceGym } from '../../../activity/gymMachine';
import { detectionStore, persistDetectionState } from '../../../activity/detectionStore';
import { GYM_CONFIRM_RECHECK_MS, gymFixStatus } from '../../../activity/gymFix';
import { distanceMetres } from '../../../gyms/geometry';
import { places } from '../places';
import type { FakeContext } from '../FakeContext';
export function GymFake(ctx: FakeContext, readFix?: () => Promise<GymLocationFix | null>) {
  const list = () => settingsStore.getState().data.gymPlaces, log = new AsyncStorageGymVisitLog();
  const locations = new Set<(fix: GymLocationFix | null) => void>(), presences = new Set<(presence: 'inside' | 'outside') => void>();
  let last: GymLocationFix | null = null, disposed = false, polling = false, writes = Promise.resolve();
  const processor = new GeofenceEventProcessor({ log, now: () => Date.parse(ctx.clock.now()),
    onPresence: () => undefined,
    onTransition: () => { const presence = list().some((gym) => processor.isInside(gym.id) === true) ? 'inside' : 'outside'; ctx.update({ presence }); presences.forEach((callback) => callback(presence)); },
  });
  const project = async () => {
    if (disposed || ctx.snapshot().loading) return;
    const state = reduceGym(detectionStore.getState().data.gym, { kind: 'records', records: await log.readAll() }, Date.parse(ctx.clock.now()));
    if (settingsStore.getState().data.gymAutoDetect && state.intervals.length > detectionStore.getState().data.gym.intervals.length) ctx.log('gym_presence_auto_confirmed');
    detectionStore.getState().patch({ gym: state });
    await persistDetectionState();
    if (disposed || ctx.snapshot().loading) return;
    projectGymProgress(ctx, state, (id) => processor.isInside(id) === true);
    await ruleDaysStore.persistBarrier();
    const snapshot = { transitions: state.records.length, visits: state.intervals.length, confirmed: state.intervals.some((visit) => visit.exitedAt === null), autoDetect: settingsStore.getState().data.gymAutoDetect, progressMinutes: Math.floor(ruleDaysStore.getState().data.days.filter((row) => rulesStore.getState().data.rules.some((condition) => condition.id === row.ruleId && condition.activity === 'gym' && condition.mode.kind === 'target')).reduce((sum, row) => sum + row.progress, 0)) };
    if (JSON.stringify(ctx.snapshot().gymVisits) !== JSON.stringify(snapshot)) ctx.update({ gymVisits: snapshot });
  };
  const flush = () => { const next = writes.catch(() => undefined).then(project); writes = next; return next; };
  const transition = async (type: 'enter' | 'exit', id: string, manualEpoch?: number) => { if (manualEpoch === undefined && type === 'enter') ctx.log('gym_presence_auto_started'); if (type === 'exit' && detectionStore.getState().data.gym.regions[id]?.confirmedSince != null) ctx.log('gym_presence_ended'); await processor.process({ type, regionId: id, atMs: Date.parse(ctx.clock.now()), manualEpoch }); await flush(); };
  const currentFix = async (request = false) => {
    if (request && !['whenInUse', 'always'].includes(permissionsStore.getState().data.location)) await ctx.request('location');
    if (!['whenInUse', 'always'].includes(permissionsStore.getState().data.location)) return null;
    const gym = list()[0];
    const point = readFix ? await readFix() : gym ? { latitude: gym.latitude + (ctx.snapshot().presence === 'outside' ? 140 / 111320 : 0), longitude: gym.longitude, accuracy: 5, atMs: Date.now() } : null;
    if (disposed || ctx.snapshot().loading) return point;
    last = point && ctx.scenario.gym?.accuracy !== undefined ? { ...point, accuracy: ctx.scenario.gym.accuracy } : point;
    locations.forEach((callback) => callback(last));
    for (const place of list()) {
      const state = detectionStore.getState().data.gym.regions[place.id];
      const manual = state?.confirmedSince != null || state?.pendingEnterAt != null;
      const auto = settingsStore.getState().data.gymAutoDetect && permissionsStore.getState().data.location === 'always';
      if (!manual && !auto) continue;
      const status = gymFixStatus(last, place);
      if (status === 'uncertain') continue;
      const inside = status === 'inside';
      if (processor.isInside(place.id) !== inside) await transition(inside ? 'enter' : 'exit', place.id, auto ? undefined : await gymVisitLogEpoch());
    }
    return last;
  };
  const stopClock = ctx.clock.observe(() => { if (!ctx.snapshot().loading) void flush().catch(() => undefined); });
  const timer = setInterval(() => { if (polling || disposed || !ctx.snapshot().hydrated || ctx.snapshot().loading) return; polling = true; void currentFix().catch(() => undefined).finally(() => { polling = false; }); }, GYM_CONFIRM_RECHECK_MS);
  const port: GymPort = {
    currentFix,
    currentLocation: currentFix,
    lastKnownLocation: () => last,
    requestLocation: async () => { await ctx.request('location'); return permissionsStore.getState().data.location; },
    requestBackgroundLocation: async () => {
      const mode = ctx.snapshot().promptMode;
      const granted = mode === 'ask' ? (await ctx.prompt({ kind: 'permission', name: 'location', scope: 'always' })) === true : mode === 'grant';
      const current = permissionsStore.getState().data.location;
      const location = granted ? 'always' : current === 'notDetermined' ? 'denied' : current;
      permissionsStore.getState().patch({ location });
      ctx.log('permission_result', { name: 'location', status: location });
      return location;
    },
    searchPlaces: async (query) => places.filter((place) => (place.name + ' ' + place.address).toLowerCase().includes(query.trim().toLowerCase())),
    suggest: async (query) => places.filter((place) => (place.name + ' ' + place.address).toLowerCase().includes(query.trim().toLowerCase())).map((place) => ({ id: place.id, title: place.name, subtitle: place.address })),
    resolve: async (suggestion) => { const place = places.find((gym) => gym.id === suggestion.id); if (!place) throw new Error('Place not found'); return { ...place, isGym: true }; },
    nearbyGyms: async () => places.map((place) => ({ ...place, isGym: true })),
    reverseGeocode: async () => 'Pinned location',
    savePlace: async (place) => {
      if (!place.name.trim()) throw new Error('Gym name required');
      if (list().length >= 5 && !list().some((gym) => gym.id === place.id)) throw new Error('Maximum five gyms');
      settingsStore.getState().patch({ gymPlaces: [...list().filter((gym) => gym.id !== place.id), place] });
      if (settingsStore.getState().data.gymAutoDetect) await resumeGymVisitLogWrites(list().map((gym) => gym.id));
    },
    listPlaces: list,
    distanceTo: (id) => { const gym = list().find((place) => place.id === id); return gym && last ? distanceMetres(gym, last) : null; },
    observeLocation: (callback) => { locations.add(callback); callback(last); return () => { locations.delete(callback); }; },
    observePresence: (callback) => { presences.add(callback); callback(list().some((gym) => processor.isInside(gym.id) === true) ? 'inside' : 'outside'); return () => { presences.delete(callback); }; },
    checkIn: async (id, confirmation) => {
      ctx.result();
      const gym = list().find((place) => place.id === id);
      if (!gym) throw new Error('Saved gym not found');
      const epoch = await gymVisitLogEpoch();
      await confirmGymCheckIn({ gym, read: () => currentFix(), confirmation, transition: (type) => transition(type, id, epoch) });
      await flush();
    },
    enableAutoDetect: async () => {
      const permission = permissionsStore.getState().data.location === 'always' ? 'always' : await port.requestBackgroundLocation();
      const enabled = permission === 'always';
      settingsStore.getState().patch({ gymAutoDetect: enabled, gymBackgroundAsked: true, gymAutoDetectOptOut: !enabled });
      if (enabled) { await resumeGymVisitLogWrites(list().map((gym) => gym.id)); await currentFix(); }
      return enabled;
    },
    disableAutoDetect: async () => { settingsStore.getState().patch({ gymAutoDetect: false, gymBackgroundAsked: true, gymAutoDetectOptOut: true }); },
  };
  return { ...port, ready: async () => { await detectionStore.persist.rehydrate(); await currentFix(); await flush(); }, flush,
    reset: async () => { await writes; processor.resetPresence(); last = null; await suspendGymVisitLogWritesAndReset(); detectionStore.getState().patch({ gym: createGymState(Date.parse(ctx.clock.now())) }); await persistDetectionState(); if (settingsStore.getState().data.gymAutoDetect) await resumeGymVisitLogWrites(list().map((gym) => gym.id)); },
    dispose: () => { disposed = true; clearInterval(timer); stopClock(); locations.clear(); presences.clear(); },
  };
}
