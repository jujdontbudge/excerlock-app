import { StepsPort } from '../../ports/StepsPort';
import { permissionsStore } from '../../state/permissionsStore';
import { FakeContext } from '../FakeContext';
export function StepsFake(ctx: FakeContext): StepsPort {
  const count = () =>
    ctx.scenario.steps.today +
    Math.floor(Math.max(0, Date.parse(ctx.clock.now()) - Date.parse(ctx.scenario.clock.now)) / 1000) *
      (ctx.scenario.steps.autoIncrementPerSecond ?? 0);
  return {
    authorizationStatus: () => permissionsStore.getState().data.motion,
    request: () => ctx.request('motion'),
    stepsSince: async () => count(),
    subscribe: (callback) => {
      callback(count());
      return ctx.clock.subscribe(() => callback(count()));
    },
  };
}
