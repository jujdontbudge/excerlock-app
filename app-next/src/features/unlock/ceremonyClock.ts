import type { ClockPort } from '../../ports/ClockPort';
import type { Unsubscribe } from '../../ports/models';

type SessionClock = ClockPort & {
  at?(deadline: string, callback: () => void): Unsubscribe;
  monotonicMs?(): number;
};

// merge: replace this compatibility module with P2-T15's required ClockPort.at/monotonicMs methods.
export function ceremonyMonotonicMs(clock: ClockPort): number {
  const sessionClock = clock as SessionClock;
  return sessionClock.monotonicMs?.() ?? Date.parse(clock.now());
}

export function ceremonyAt(clock: ClockPort, deadline: string, callback: () => void): Unsubscribe {
  const sessionClock = clock as SessionClock;
  if (sessionClock.at) return sessionClock.at(deadline, callback);

  let fired = false;
  let unsubscribe: Unsubscribe = () => undefined;
  const check = () => {
    if (fired || Date.parse(clock.now()) < Date.parse(deadline)) return;
    fired = true;
    unsubscribe();
    callback();
  };
  unsubscribe = clock.subscribe(check);
  check();
  return () => {
    fired = true;
    unsubscribe();
  };
}
