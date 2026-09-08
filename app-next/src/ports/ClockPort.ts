import { Unsubscribe } from './models';
export interface ClockPort {
  now(): string;
  /** Elapsed milliseconds that no clock change can rewind, for measuring a ceremony's own duration. */
  monotonicMs(): number;
  timezone(): string;
  /** Runs the callback when the instant arrives, immediately if it already has. */
  at(deadline: string, callback: () => void): Unsubscribe;
  subscribe(callback: () => void): Unsubscribe;
}
