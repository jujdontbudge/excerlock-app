import type { PermissionStatus } from '../../../model/types';
import type { PedometerMetrics, StepsPort } from '../../../ports/StepsPort';
import type { MotionProvider, Unsubscribe } from '../motion/MotionProvider';
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
  async stepsBetween(from: string, to: string): Promise<number> {
    return (await this.motion.querySteps(Date.parse(from), Date.parse(to))).steps;
  }
  async metricsBetween(from: string, to: string): Promise<PedometerMetrics> {
    const value = await this.motion.querySteps(Date.parse(from), Date.parse(to));
    return {
      steps: value.steps,
      distanceMeters: value.distanceMeters ?? null,
      floorsAscended: value.floorsAscended ?? null,
      activeMinutes: value.activeMinutes ?? null,
    };
  }
  subscribe(callback: (steps: number) => void): Unsubscribe {
    return this.motion.on('cadence', (sample) => callback(sample.cumulativeSteps));
  }
}
