import { StepsPort } from '../../ports/StepsPort';
import { permissionsStore } from '../../state/permissionsStore';
import { FakeContext } from '../FakeContext';
import { stepCount } from '../stepCount';
export function StepsFake(ctx: FakeContext): StepsPort {
  const count = () => stepCount(ctx);
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
