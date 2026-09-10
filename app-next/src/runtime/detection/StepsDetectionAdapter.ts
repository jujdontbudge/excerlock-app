import type { PermissionStatus } from '../../domain/types';
import type { StepsPort } from '../../ports/StepsPort';
import type { MotionProvider, Unsubscribe } from '../../engine/signals/motion/MotionProvider';
export class StepsDetectionAdapter implements StepsPort {
  constructor(
    private readonly motion: MotionProvider,
    private readonly now: () => number = Date.now,
  ) {}
  authorizationStatus(): PermissionStatus {
    const value = this.motion.getAuthorizationStatus();
    return value === 'authorized' ? 'granted' : value;
  }
  async request(): Promise<PermissionStatus> {
    const value = await this.motion.requestAuthorization();
    return value === 'authorized' ? 'granted' : value;
  }
  async stepsSince(dayStart: string): Promise<number> {
    return (await this.motion.querySteps(Date.parse(dayStart), this.now())).steps;
  }
  subscribe(callback: (steps: number) => void): Unsubscribe {
    return this.motion.on('cadence', (sample) => callback(sample.cumulativeSteps));
  }
}
