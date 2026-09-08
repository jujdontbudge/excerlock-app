import { ReachabilityPort } from '../../ports/ReachabilityPort';
import { FakeContext } from '../FakeContext';

export function ReachabilityFake(context: FakeContext): ReachabilityPort {
  return { isOnline: async () => context.snapshot().online };
}
