import { StepsPort } from '../../../ports/StepsPort';
import { permissionsStore } from '../../../permissions/permissionsStore';
import { FakeContext } from '../FakeContext';
import { stepCount } from '../stepCount';
import { dayKey } from '../../../schedule/calendar';
export function StepsFake(ctx: FakeContext): StepsPort {
  const count = () => stepCount(ctx);
  const baselineAt = (from: string) => {
    if (Date.parse(from) < Date.parse(ctx.scenario.clock.now)) return 0;
    const override = ctx.snapshot().stepsOverride;
    if (override && Date.parse(override.at) <= Date.parse(from)) return override.value;
    return ctx.scenario.steps.today + Math.floor(Math.max(0, Date.parse(from) - Date.parse(ctx.scenario.clock.now)) / 1000) * (ctx.scenario.steps.autoIncrementPerSecond ?? 0);
  };
  const pastSteps = (from: string, to: string) => {
    if (!ctx.scenario.steps.pastFromHistory || Date.parse(from) > Date.parse(ctx.clock.now())) return 0;
    const day = dayKey(from, ctx.clock.timezone());
    return Date.parse(to) - Date.parse(from) > 0 ? (ctx.snapshot().history.find((d) => d.day === day)?.activity.walking ?? 0) : 0;
  };
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
      const steps = Date.parse(from) <= now && now < Date.parse(to) ? Math.max(0, count() - baselineAt(from)) : pastSteps(from, to);
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
