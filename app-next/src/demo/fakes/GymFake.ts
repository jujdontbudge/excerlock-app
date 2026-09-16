import { gymProgress } from '../gymProgress';
import { GymPort } from '../../ports/GymPort';
import { permissionsStore } from '../../state/permissionsStore';
import { settingsStore } from '../../state/settingsStore';
import { rulesStore } from '../../state/rulesStore';
import { ruleDaysStore } from '../../state/ruleDaysStore';
import { dayKey, currentInstances } from '../../domain/schedule';
import { applyProgress } from '../../domain/progress';
import { places } from '../places';
import { FakeContext } from '../FakeContext';
import { distanceMetres } from '../../features/gym-picker/geometry';
export function GymFake(ctx: FakeContext): GymPort & { dispose: () => void } {
  const list = () => settingsStore.getState().data.gymPlaces;
  const progress = gymProgress(ctx);
  const location = () => {
    const p = list()[0];
    return p ? { latitude: p.latitude + (ctx.snapshot().presence === 'outside' ? 140/111320 : 0), longitude: p.longitude } : null;
  };
  return {
    dispose: progress.dispose,
    requestLocation: async () => {
      await ctx.request('location');
      return permissionsStore.getState().data.location;
    },
    requestBackgroundLocation: async () => {
      await ctx.request('location');
      return permissionsStore.getState().data.location;
    },
    searchPlaces: async (query) =>
      places.filter((p) => (p.name + ' ' + p.address).toLowerCase().includes(query.trim().toLowerCase())),
    suggest: async (query) => places.filter((p) => (p.name + ' ' + p.address).toLowerCase().includes(query.trim().toLowerCase()))
      .map((p) => ({ id: p.id, title: p.name, subtitle: p.address })),
    resolve: async (suggestion) => {
      const place = places.find((p) => p.id === suggestion.id);
      if (!place) throw new Error('Place not found');
      return { ...place, isGym: true };
    },
    nearbyGyms: async () => places.map((p) => ({ ...p, isGym: true })),
    reverseGeocode: async (c) => `${Math.abs(Math.round(c.latitude * 10000)) % 900 + 100} Demo Street, ${c.longitude.toFixed(4)}`,
    currentLocation: async (request = false) => {
      if (request) await ctx.request('location');
      const permission = permissionsStore.getState().data.location;
      return permission === 'whenInUse' || permission === 'always' ? location() : null;
    },
    savePlace: async (place) => {
      if (!place.name.trim()) throw new Error('Gym name required');
      if (list().length >= 5 && !list().some((p) => p.id === place.id)) throw new Error('Maximum five gyms');
      settingsStore.getState().patch({
        gymPlaces: [
          ...list().filter((p) => p.id !== place.id),
          { ...place, name: place.name.trim(), radiusMeters: Math.min(200, Math.max(50, Math.round((place.radiusMeters || 100) / 10) * 10)) },
        ],
      });
      ctx.log('gym_saved', { id: place.id });
    },
    listPlaces: list,
    distanceTo: (id) => { const p = list().find((g) => g.id === id), l = location(); return p && l ? distanceMetres(p,l) : null; },
    observeLocation: (callback) => { callback(location()); return ctx.subscribe(() => callback(location())); },
    checkIn: async (id, confirmation) => {
      ctx.result();
      if (ctx.snapshot().presence !== 'inside') throw new Error('Outside saved gym');
      if (!list().some((p) => p.id === id)) throw new Error('Gym not found');
      const startedAt = ctx.clock.now();
      const session = () => ruleDaysStore.getState().data.gymPresence;
      const mine = () => session()?.placeId === id && session()?.startedAt === startedAt;
      if (confirmation) {
        if (!session()?.confirmedAt) ruleDaysStore.getState().patch({ gymPresence: { placeId: id, startedAt, confirmedAt: null } });
        try {
          await new Promise<void>((resolve, reject) => {
            const finish = (error?: Error) => { clearTimeout(timer); stop(); confirmation.signal.removeEventListener('abort', abort); if (error) reject(error); else resolve(); };
            const abort = () => finish(new Error('Check-in cancelled'));
            const timer = setTimeout(() => finish(), confirmation.milliseconds);
            const stop = ctx.subscribe(() => { if (ctx.snapshot().presence !== 'inside') finish(new Error('Left gym')); });
            confirmation.signal.addEventListener('abort', abort);
            if (confirmation.signal.aborted) abort();
          });
        } catch (error) {
          if (mine()) ruleDaysStore.getState().patch({ gymPresence: null });
          throw error;
        }
      }
      if (ctx.snapshot().presence !== 'inside') throw new Error('Left gym');
      if (!session()?.confirmedAt || session()?.placeId !== id)
        ruleDaysStore.getState().patch({ gymPresence: { placeId: id, startedAt, confirmedAt: ctx.clock.now() } });
      progress.arrive();
      ctx.log('gym_presence_confirmed', { id });
      const current = ruleDaysStore.getState().data.days;
      const updates = rulesStore
        .getState()
        .data.rules.filter((r) => r.activity === 'gym' && r.enabled)
        .map((rule) => {
          const day =
            currentInstances(rule, ctx.clock.now(), ctx.clock.timezone())[0]?.day ??
            dayKey(ctx.clock.now(), ctx.clock.timezone());
          return applyProgress(
            rule,
            current.find((d) => d.ruleId === rule.id && d.day === day) ?? {
              ruleId: rule.id,
              day,
              progress: 0,
              met: false,
              metAt: null,
            },
            rule.mode.kind === 'event'
              ? 1
              : (current.find((d) => d.ruleId === rule.id && d.day === day)?.progress ?? 0),
            ctx.clock.now(),
          );
        });
      ruleDaysStore.getState().patch({
        days: [...current.filter((d) => !updates.some((u) => u.ruleId === d.ruleId && u.day === d.day)), ...updates],
      });
    },
    enableAutoDetect: async () => {
      const mode = ctx.snapshot().promptMode;
      const granted =
        mode === 'ask'
          ? (await ctx.prompt({ kind: 'permission', name: 'location', scope: 'always' })) === true
          : mode === 'grant';
      if (granted) {
        permissionsStore.getState().patch({ location: 'always' });
        settingsStore.getState().patch({ gymAutoDetect: true });
        return true;
      }
      return false;
    },
    disableAutoDetect: async () => { settingsStore.getState().patch({ gymAutoDetect: false }); },
    observePresence: (callback) => {
      let last = ctx.snapshot().presence;
      callback(last);
      return ctx.subscribe(() => { const next = ctx.snapshot().presence; if (last !== next) { last = next; callback(next); } });
    },
  };
}
