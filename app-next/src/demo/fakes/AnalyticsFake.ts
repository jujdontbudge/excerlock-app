import { AnalyticsPort } from '../../ports/AnalyticsPort';
import { FakeContext } from '../FakeContext';
export function AnalyticsFake(ctx: FakeContext): AnalyticsPort {
  return {
    track: ctx.log,
    screen: (name) => ctx.log('screen', { name }),
    identify: async (id) => {
      ctx.log('identify', { id });
    },
    reset: async () => {
      ctx.update({ events: [] });
    },
  };
}
