import { PermissionStatus } from '../domain/types';
import { Unsubscribe } from './models';
export type PedometerMetrics = {
  steps: number;
  distanceMeters: number | null;
  floorsAscended: number | null;
  activeMinutes: number | null;
};
export interface StepsPort {
  authorizationStatus(): PermissionStatus;
  request(): Promise<PermissionStatus>;
  stepsSince(dayStart: string): Promise<number>;
  /** Apple's pedometer total bounded to one analytics interval. */
  stepsBetween(from: string, to: string): Promise<number>;
  /** Apple pedometer detail for analytics; nullable fields reflect device capability. */
  metricsBetween(from: string, to: string): Promise<PedometerMetrics>;
  subscribe(callback: (steps: number) => void): Unsubscribe;
}
