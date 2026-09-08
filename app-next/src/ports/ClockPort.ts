import { Unsubscribe } from './models';
export interface ClockPort {
  now(): string;
  // merge: P2-T15 owns these two methods and their final adapter contracts.
  monotonicMs(): number;
  at(deadline: string, callback: () => void): Unsubscribe;
  timezone(): string;
  subscribe(callback: () => void): Unsubscribe;
}
