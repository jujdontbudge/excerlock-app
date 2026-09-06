import { GymPort } from '../../ports/GymPort';
import { SavedPlace } from '../../ports/models';
import { permissionsStore } from '../../state/permissionsStore';
import { settingsStore } from '../../state/settingsStore';
import { rulesStore } from '../../state/rulesStore';
import { ruleDaysStore } from '../../state/ruleDaysStore';
import { dayKey } from '../../domain/schedule';
import { applyProgress } from '../../domain/progress';
import { places } from '../places';
import { FakeContext } from '../FakeContext';
export function GymFake(ctx: FakeContext): GymPort {
  let saved: SavedPlace[] = [];
  let loadedId = '';
  const list = () => {
    if (loadedId !== ctx.scenario.id) {
      saved = ctx.scenario.gym?.places ?? [];
      loadedId = ctx.scenario.id;
    }
    return saved;
  };
  return {
    searchPlaces: async (query) =>
      places.filter((p) => (p.name + ' ' + p.address).toLowerCase().includes(query.trim().toLowerCase())),
    savePlace: async (place) => {
      saved = [...list().filter((p) => p.id !== place.id), place];
      ctx.log('gym_saved', { id: place.id });
    },
    listPlaces: list,
    checkIn: async (id) => {
      ctx.result();
      if (!list().some((p) => p.id === id)) throw new Error('Gym not found');
      ctx.update({ presence: 'inside' });
      const day = dayKey(ctx.clock.now(), ctx.clock.timezone()),
        current = ruleDaysStore.getState().data.days;
      const updates = rulesStore
        .getState()
        .data.rules.filter((r) => r.activity === 'gym' && r.enabled)
        .map((rule) =>
          applyProgress(
            rule,
            current.find((d) => d.ruleId === rule.id && d.day === day) ?? {
              ruleId: rule.id,
              day,
              progress: 0,
              met: false,
              metAt: null,
            },
            rule.mode.kind === 'event' ? 1 : 0,
            ctx.clock.now(),
          ),
        );
      ruleDaysStore.getState().patch({
        days: [...current.filter((d) => !updates.some((u) => u.ruleId === d.ruleId && u.day === d.day)), ...updates],
      });
    },
    enableAutoDetect: async () => {
      const status = await ctx.request('location');
      if (status === 'granted') {
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
