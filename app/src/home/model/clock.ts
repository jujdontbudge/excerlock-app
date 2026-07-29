/**
 * `@excerlock/ledger` works in local wall-clock milliseconds and makes the edge
 * convert once (its README's first invariant). Home is that edge.
 */
export function localWallClockNow(now: number = Date.now()): number {
  return now - new Date(now).getTimezoneOffset() * 60_000;
}
