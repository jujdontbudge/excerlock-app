import { Unsubscribe } from './models';
export interface ClockPort {
  now(): string;
  timezone(): string;
  /** Fires once at or after `deadline`. Nothing outside this port schedules product meaning. */
  at(deadline: string, callback: () => void): Unsubscribe;
  /** A monotonic reading for elapsed-time math that a wall-clock change must not disturb. */
  monotonicMs(): number;
  subscribe(callback: () => void): Unsubscribe;
}
