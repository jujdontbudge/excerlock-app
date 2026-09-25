import { PermissionStatus } from '../model/types';
import { Unsubscribe } from '../model/models';
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
  stepsBetween(from: string, to: string): Promise<number>;
  metricsBetween(from: string, to: string): Promise<PedometerMetrics>;
  subscribe(callback: (steps: number) => void): Unsubscribe;
}
