import { MIN_MS } from './day'

/**
 * App-fixed Walk & Scroll unlock increment (PRD §3.5b / ticket #4): Apple's
 * official 15-minute DeviceActivity minimum, used as-is. Not user-set — letting
 * users raise it would let them pick their exploit size. The OS-side schedule
 * re-shields when a window lapses, so force-quitting the app mid-session caps
 * the exploit at one increment.
 */
export const WALK_INCREMENT_MINUTES = 15
const INCREMENT_MS = WALK_INCREMENT_MINUTES * MIN_MS

/** One unlock window [startMs, endMs). `startMs` is the session's explicit start. */
export interface WalkWindow {
  startMs: number
  endMs: number
}

/** Start a session: exactly one increment from now, never more. */
export function planWalkIncrement(nowMs: number): WalkWindow {
  return { startMs: nowMs, endMs: nowMs + INCREMENT_MS }
}

/** Is the unlock window live at `nowMs`? Half-open: lapses exactly at endMs. */
export function isWalkWindowActive(window: WalkWindow | null | undefined, nowMs: number): boolean {
  return window != null && nowMs >= window.startMs && nowMs < window.endMs
}

/**
 * A walking re-verification renews the window to one increment from the
 * re-verify moment. A lapsed window can never be extended — the session is
 * over and only an explicit fresh start (planWalkIncrement) re-opens access.
 */
export function extendWalkIncrement(window: WalkWindow, nowMs: number): WalkWindow | null {
  if (!isWalkWindowActive(window, nowMs)) return null
  return { startMs: window.startMs, endMs: nowMs + INCREMENT_MS }
}
