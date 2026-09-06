import { HealthPort } from '../../ports/HealthPort';
import { permissionsStore } from '../../state/permissionsStore';
import { FakeContext } from '../FakeContext';
export function HealthFake(ctx: FakeContext): HealthPort {
  return {
    authorizationStatus: () => permissionsStore.getState().data.health,
    request: () => ctx.request('health'),
    workoutsToday: async (kind) => ctx.scenario.health?.workoutsToday.filter((w) => w.kind === kind) ?? [],
  };
}
