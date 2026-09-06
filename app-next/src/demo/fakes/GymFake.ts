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
export function GymFake(ctx: FakeContext): GymPort & { dispose: () => void } {
  const list = () => settingsStore.getState().data.gymPlaces;
  const progress = gymProgress(ctx);
  return {
    dispose: progress.dispose,
    requestLocation: async () => {
      await ctx.request('location');
      return permissionsStore.getState().data.location;
    },
    searchPlaces: async (query) =>
      places.filter((p) => (p.name + ' ' + p.address).toLowerCase().includes(query.trim().toLowerCase())),
    savePlace: async (place) => {
      if (!place.name.trim()) throw new Error('Gym name required');
      if (list().length >= 5 && !list().some((p) => p.id === place.id)) throw new Error('Maximum five gyms');
      settingsStore.getState().patch({
        gymPlaces: [
          ...list().filter((p) => p.id !== place.id),
          { ...place, name: place.name.trim(), radiusMeters: 100 },
        ],
      });
      ctx.log('gym_saved', { id: place.id });
    },
    listPlaces: list,
    checkIn: async (id) => {
      ctx.result();
      if (ctx.snapshot().presence !== 'inside') throw new Error('Outside saved gym');
      if (!list().some((p) => p.id === id)) throw new Error('Gym not found');
      progress.arrive();
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
    disableAutoDetect: () => settingsStore.getState().patch({ gymAutoDetect: false }),
    observePresence: (callback) => {
      callback(ctx.snapshot().presence);
      return ctx.subscribe(() => callback(ctx.snapshot().presence));
    },
  };
}
