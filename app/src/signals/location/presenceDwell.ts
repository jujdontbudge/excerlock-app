/** Invisible hold before a raw region enter counts as an arrival. */
export const PRESENCE_CONFIRMATION_MS = 30_000;

/**
 * The dwell is a comparison of two timestamps, never a running clock: iOS gives
 * a background-launched app roughly ten seconds, so nothing that has to survive
 * suspension may depend on a JS timer still being alive.
 */
export function hasDwelled(enterAtMs: number, atMs: number): boolean {
  return atMs - enterAtMs >= PRESENCE_CONFIRMATION_MS;
}
