import type { FakeContext } from './FakeContext';
import { rulesStore } from '../../conditions/rulesStore';
import { ruleDaysStore } from '../../conditions/ruleDaysStore';
import { settingsStore } from '../../preferences/settingsStore';
import { projectInstanceProgress } from '../../progress/projectInstanceProgress';
import type { GymDetectionState } from '../../activity/gymMachine';
export function projectGymProgress(ctx: FakeContext, state: GymDetectionState, present: (id: string) => boolean) {
  const configured = settingsStore.getState().data.gymPlaces.map((gym) => gym.id);
  const days = projectInstanceProgress(rulesStore.getState().data.rules.filter((condition) => condition.activity === 'gym'), ruleDaysStore.getState().data.days, {}, [], state.intervals, configured, ctx.clock.timezone(), ctx.clock.now());
  const id = configured.find((regionId) => state.regions[regionId]?.confirmedSince != null && present(regionId));
  const confirmed = id ? state.regions[id].confirmedSince : null;
  const pendingId = configured.find((regionId) => state.regions[regionId]?.pendingEnterAt != null && present(regionId));
  const pending = pendingId ? state.regions[pendingId].pendingEnterAt : null;
  const gymPresence = id && confirmed != null ? { placeId: id, startedAt: new Date(confirmed).toISOString(), confirmedAt: new Date(confirmed).toISOString() } : pendingId && pending != null ? { placeId: pendingId, startedAt: new Date(pending).toISOString(), confirmedAt: null } : null;
  if (JSON.stringify(days) !== JSON.stringify(ruleDaysStore.getState().data.days) || JSON.stringify(gymPresence) !== JSON.stringify(ruleDaysStore.getState().data.gymPresence)) ruleDaysStore.getState().patch({ days, gymPresence });
}
