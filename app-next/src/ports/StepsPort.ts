import { PermissionStatus } from '../domain/types';
import { Unsubscribe } from './models';
export interface StepsPort {
  authorizationStatus(): PermissionStatus;
  request(): Promise<PermissionStatus>;
  stepsSince(dayStart: string): Promise<number>;
  /** Apple's pedometer total bounded to one analytics interval. */
  stepsBetween(from: string, to: string): Promise<number>;
  subscribe(callback: (steps: number) => void): Unsubscribe;
}
