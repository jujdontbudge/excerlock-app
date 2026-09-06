import { Unsubscribe } from './models';
export interface ClockPort {
  now(): string;
  timezone(): string;
  subscribe(callback: () => void): Unsubscribe;
}
