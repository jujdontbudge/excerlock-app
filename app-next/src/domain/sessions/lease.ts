/**
 * The walking lease.
 *
 * Copied verbatim in behaviour from `packages/ledger/src/walk.ts`
 * (`planWalkIncrement`, `isWalkWindowActive`, `extendWalkIncrement`) per the
 * P2-T15 §2 amendment. The package is not imported: the ledger is retired with
 * the balance economy, but these three functions are the lease law and survive
 * it unchanged.
 */

/**
 * App-fixed unlock increment (PRD §3.5b): Apple's 15-minute DeviceActivity
 * minimum, used as-is. Not user-set — letting people raise it would let them
 * pick their own exploit size. The OS-side schedule re-shields when a window
 * lapses, so force-quitting the app mid-session caps the exploit at one
 * increment.
 */
export const WALK_INCREMENT_MINUTES = 15;

export const WALK_INCREMENT_MS = WALK_INCREMENT_MINUTES * 60_000;

/** One unlock window [startMs, endMs). `startMs` is the session's explicit start. */
export type WalkWindow = Readonly<{
  startMs: number;
  endMs: number;
}>;

/** Start a session: exactly one increment from now, never more. */
export function planWalkIncrement(nowMs: number): WalkWindow {
  return { startMs: nowMs, endMs: nowMs + WALK_INCREMENT_MS };
}

/** Is the unlock window live at `nowMs`? Half-open: it lapses exactly at endMs. */
export function isWalkWindowActive(
  window: WalkWindow | null | undefined,
  nowMs: number,
): boolean {
  return window != null && nowMs >= window.startMs && nowMs < window.endMs;
}

/**
 * A walking re-verification renews the window to one increment from the
 * re-verify moment. A lapsed window can never be extended — the session is over
 * and only an explicit fresh start (`planWalkIncrement`) reopens access. This
 * is why the port has no `renew()`: a `verified` event renews, nothing else.
 */
export function extendWalkIncrement(
  window: WalkWindow,
  nowMs: number,
): WalkWindow | null {
  if (!isWalkWindowActive(window, nowMs)) return null;
  return { startMs: window.startMs, endMs: nowMs + WALK_INCREMENT_MS };
}
