export interface ActiveWindow {
  readonly startMinute?: number;
  readonly endMinute?: number;
}

export interface ActiveWindowBoundary {
  readonly atMs: number;
  readonly type: "start" | "end";
}

const MINUTES_PER_DAY = 24 * 60;
export const DAY_MS = MINUTES_PER_DAY * 60_000;

export function validateActiveWindow(window: ActiveWindow | undefined): void {
  if (window === undefined) {
    return;
  }
  for (const minute of [window.startMinute, window.endMinute]) {
    if (
      minute !== undefined &&
      (!Number.isInteger(minute) || minute < 0 || minute >= MINUTES_PER_DAY)
    ) {
      throw new Error(
        "Active-window minutes must be whole numbers from 0 through 1439.",
      );
    }
  }
  if (
    window.startMinute !== undefined &&
    window.endMinute !== undefined &&
    window.startMinute === window.endMinute
  ) {
    throw new Error("Active-window start and end must differ.");
  }
}

export function isInsideActiveWindow(
  window: ActiveWindow | undefined,
  atMs: number,
  dayStartMs: number,
): boolean {
  if (window === undefined) {
    return true;
  }

  const minute = (atMs - dayStartMs) / 60_000;
  const { startMinute, endMinute } = window;
  if (startMinute === undefined) {
    return endMinute === undefined || minute < endMinute;
  }
  if (endMinute === undefined) {
    return minute >= startMinute;
  }
  if (startMinute < endMinute) {
    return minute >= startMinute && minute < endMinute;
  }
  return minute >= startMinute || minute < endMinute;
}

export function activeWindowBoundaries(
  window: ActiveWindow | undefined,
  dayStartMs: number,
  nowMs: number,
): readonly ActiveWindowBoundary[] {
  if (window === undefined) {
    return [];
  }

  const boundaries: ActiveWindowBoundary[] = [];
  if (window.startMinute !== undefined) {
    const atMs = dayStartMs + window.startMinute * 60_000;
    if (atMs <= nowMs) {
      boundaries.push({ atMs, type: "start" });
    }
  }
  if (window.endMinute !== undefined) {
    const atMs = dayStartMs + window.endMinute * 60_000;
    if (atMs <= nowMs) {
      boundaries.push({ atMs, type: "end" });
    }
  }
  return boundaries.sort((left, right) => left.atMs - right.atMs);
}
