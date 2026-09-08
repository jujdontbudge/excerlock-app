import { Unsubscribe } from './models';
export interface ClockPort {
  now(): string;
  timezone(): string;
  at(deadline: string, callback: () => void): Unsubscribe;
  monotonicMs(): number;
  subscribe(callback: () => void): Unsubscribe;
}
