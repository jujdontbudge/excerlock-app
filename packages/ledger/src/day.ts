/**
 * Day-boundary math. All timestamps in this package are LOCAL WALL-CLOCK
 * milliseconds (the caller converts from real epoch time once, at the edge).
 * Days are therefore uniform 24 h; DST is absorbed by the wall-clock mapping.
 */
export const DAY_MS = 86_400_000
export const MIN_MS = 60_000

/** Which ledger day a moment belongs to, given the user-set boundary (minutes after midnight). */
export function dayIndexFor(atMs: number, dayBoundaryOffsetMinutes: number): number {
  return Math.floor((atMs - dayBoundaryOffsetMinutes * MIN_MS) / DAY_MS)
}

/** The instant day `dayIndex` begins (inclusive). */
export function dayStartMs(dayIndex: number, dayBoundaryOffsetMinutes: number): number {
  return dayIndex * DAY_MS + dayBoundaryOffsetMinutes * MIN_MS
}

/** The instant day `dayIndex` ends (exclusive) — identical to the next day's start. */
export function dayEndMs(dayIndex: number, dayBoundaryOffsetMinutes: number): number {
  return dayStartMs(dayIndex + 1, dayBoundaryOffsetMinutes)
}
