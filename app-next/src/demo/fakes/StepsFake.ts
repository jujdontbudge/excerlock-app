import { StepsPort } from '../../ports/StepsPort';
import { permissionsStore } from '../../state/permissionsStore';
import { FakeContext } from '../FakeContext';
import { dayKey } from '../../domain/schedule';
export function StepsFake(ctx: FakeContext): StepsPort {
  const count = () => {
    const now = ctx.clock.now(),
      today = dayKey(now, ctx.clock.timezone()),
      override = ctx.snapshot().stepsOverride;
    if (override?.day === today) return override.value;
    if (dayKey(ctx.scenario.clock.now, ctx.clock.timezone()) !== today) return 0;
    return (
      ctx.scenario.steps.today +
      Math.floor(Math.max(0, Date.parse(now) - Date.parse(ctx.scenario.clock.now)) / 1000) *
        (ctx.scenario.steps.autoIncrementPerSecond ?? 0)
    );
  };
  return {
    authorizationStatus: () => permissionsStore.getState().data.motion,
    request: () => ctx.request('motion'),
    stepsSince: async () => count(),
    subscribe: (callback) => {
      callback(count());
      const stops = [ctx.clock.subscribe(() => callback(count())), ctx.subscribe(() => callback(count()))];
      return () => stops.forEach((stop) => stop());
    },
  };
}
