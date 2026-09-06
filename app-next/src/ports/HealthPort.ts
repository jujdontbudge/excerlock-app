import { PermissionStatus } from '../domain/types';
import { Workout } from './models';
export interface HealthPort {
  authorizationStatus(): PermissionStatus;
  request(): Promise<PermissionStatus>;
  workoutsToday(kind: 'running' | 'biking'): Promise<Workout[]>;
}
