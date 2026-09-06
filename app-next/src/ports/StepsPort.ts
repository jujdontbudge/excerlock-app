import { PermissionStatus } from '../domain/types';
import { Unsubscribe } from './models';
export interface StepsPort {
  authorizationStatus(): PermissionStatus;
  request(): Promise<PermissionStatus>;
  stepsSince(dayStart: string): Promise<number>;
  subscribe(callback: (steps: number) => void): Unsubscribe;
}
