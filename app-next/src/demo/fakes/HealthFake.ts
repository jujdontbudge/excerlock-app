import { HealthPort } from '../../ports/HealthPort';
import { permissionsStore } from '../../state/permissionsStore';
import { FakeContext } from '../FakeContext';
import { dayKey } from '../../domain/schedule';
export function HealthFake(ctx: FakeContext): HealthPort {
  return {
    authorizationStatus: () => permissionsStore.getState().data.health,
    request: () => ctx.request('health'),
    workoutsToday: async (kind) =>
      dayKey(ctx.clock.now(), ctx.clock.timezone()) === dayKey(ctx.scenario.clock.now, ctx.clock.timezone())
        ? (ctx.scenario.health?.workoutsToday.filter((w) => w.kind === kind) ?? [])
        : [],
  };
}
