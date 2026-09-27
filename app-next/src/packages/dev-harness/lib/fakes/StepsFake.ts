import { StepsPort } from '../../../ports/StepsPort';
import { permissionsStore } from '../../../permissions/permissionsStore';
import { FakeContext } from '../FakeContext';
import { stepCount } from '../stepCount';
import { dayKey } from '../../../schedule/calendar';
export function StepsFake(ctx: FakeContext): StepsPort {
  const count = () => stepCount(ctx);
  return {
    authorizationStatus: () => permissionsStore.getState().data.motion,
    request: () => ctx.request('motion'),
    stepsSince: async () => count(),
    stepsBetween: async (from, to) => {
      const now = Date.parse(ctx.clock.now());
      return Date.parse(from) <= now && now < Date.parse(to) ? count() : 0;
    },
    metricsBetween: async (from, to) => {
      const now = Date.parse(ctx.clock.now());
      const steps = Date.parse(from) <= now && now < Date.parse(to) ? count() : recordedSteps(ctx, from, to);
      return {
        steps,
        distanceMeters: steps * 0.76,
        floorsAscended: Math.floor(steps / 3000),
        activeMinutes: steps / 100,
      };
    },
    subscribe: (callback) => {
      callback(count());
      const stops = [ctx.clock.subscribe(() => callback(count())), ctx.subscribe(() => callback(count()))];
      return () => stops.forEach((stop) => stop());
    },
  };
}
function recordedSteps(ctx: FakeContext, from: string, to: string): number {
  const timezone = ctx.clock.timezone(),
    first = dayKey(from, timezone),
    last = dayKey(new Date(Date.parse(to) - 1).toISOString(), timezone);
  return ctx
    .snapshot()
    .history.filter((row) => row.day >= first && row.day <= last)
    .reduce((total, row) => total + row.activity.walking, 0);
}
