import { AnalyticsPort } from '../../ports/AnalyticsPort';
import { FakeContext } from '../FakeContext';
export function AnalyticsFake(ctx: FakeContext): AnalyticsPort {
  return {
    track: ctx.log,
    screen: (name) => ctx.log('screen', { name }),
    identify: (id) => ctx.log('identify', { id }),
    setPersonProperties: (props) => ctx.log('person', props),
    reset: () => ctx.update({ events: [] }),
  };
}
