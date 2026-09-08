import { ClockPort } from '../ports/ClockPort';
import { Unsubscribe } from '../ports/models';

/**
 * `setTimeout` stores its delay in a 32-bit integer, so a longer one fires immediately. A deadline
 * further out than this is re-armed in chunks; the enforcement host sets deadlines a day out.
 */
export const MAX_TIMER_MS = 2_147_483_000;

/** How often a subscriber hears from the clock. Rendering wants a second; enforcement uses `at`. */
export const TICK_MS = 1_000;

export type SystemClock = ClockPort & { dispose(): void };

export type SystemClockOptions = {
  now?: () => number;
  timezone?: () => string;
};

/**
 * The device's clock as a `ClockPort`.
 *
 * Two things separate it from `Date.now()` at a call site. Monotonic time is accumulated from
 * forward movement only, so a user who sets their phone back an hour cannot shorten a ceremony that
 * is already running. And `at()` re-checks the instant when its timer fires rather than trusting the
 * delay it computed, because the system clock can move while a timer is armed — the deadline is a
 * moment in time, not a countdown.
 *
 * Wall-clock rewind is still enforcement's problem, not this file's: `domain/watermark` clamps a
 * rewound `now()` so the apps stay locked. This class only guarantees it never lies about elapsed
 * time and never fires a deadline early.
 */
export function createSystemClock(options: SystemClockOptions = {}): SystemClock {
  const wall = options.now ?? (() => Date.now());
  const zone = options.timezone ?? (() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  let monotonic = 0;
  let highWater = wall();
  let disposed = false;
  const listeners = new Set<() => void>();
  let ticker: ReturnType<typeof setInterval> | undefined;

  // A high-water mark, not a running delta: setting the clock back and forward again would
  // otherwise credit the whole forward jump, which is how a user would shorten a ceremony.
  const monotonicMs = () => {
    const observed = wall();
    if (observed > highWater) {
      monotonic += observed - highWater;
      highWater = observed;
    }
    return monotonic;
  };

  return {
    now: () => new Date(wall()).toISOString(),
    monotonicMs,
    timezone: zone,
    at(deadline, callback) {
      const instant = Date.parse(deadline);
      if (!Number.isFinite(instant)) throw new Error('INVALID_CLOCK_DEADLINE');
      let timer: ReturnType<typeof setTimeout> | undefined;
      let cancelled = false;
      const arm = () => {
        if (cancelled || disposed) return;
        const remaining = instant - wall();
        if (remaining <= 0) {
          callback();
          return;
        }
        timer = setTimeout(arm, Math.min(remaining, MAX_TIMER_MS));
      };
      arm();
      return () => {
        cancelled = true;
        if (timer !== undefined) clearTimeout(timer);
      };
    },
    subscribe(callback): Unsubscribe {
      listeners.add(callback);
      if (!ticker && !disposed) {
        ticker = setInterval(() => {
          monotonicMs();
          listeners.forEach((listener) => listener());
        }, TICK_MS);
      }
      return () => {
        listeners.delete(callback);
        if (!listeners.size && ticker) {
          clearInterval(ticker);
          ticker = undefined;
        }
      };
    },
    dispose() {
      disposed = true;
      if (ticker) clearInterval(ticker);
      ticker = undefined;
      listeners.clear();
    },
  };
}
