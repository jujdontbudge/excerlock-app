export const WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type Weekday = (typeof WEEKDAYS)[number];

export interface RecurringLockWindow {
  readonly id: string;
  /** The local weekdays on which this interval starts. */
  readonly days: readonly Weekday[];
  /** Whole minutes after local midnight, from 0 through 1,439. */
  readonly startMinute: number;
  readonly endMinute: number;
}

export type SaveRecurringLockWindowResult =
  | Readonly<{
      ok: true;
      windows: readonly RecurringLockWindow[];
    }>
  | Readonly<{
      ok: false;
      error: "invalidId" | "noDays" | "invalidTime" | "emptyInterval";
    }>
  | Readonly<{
      ok: false;
      error: "overlap";
      conflictingWindowId: string;
    }>;

const MINUTES_PER_DAY = 24 * 60;
const MINUTES_PER_WEEK = 7 * MINUTES_PER_DAY;

const DAY_INDEX: Readonly<Record<Weekday, number>> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

/**
 * Validates and upserts one definition. Overlaps are rejected rather than
 * silently merged, so editing one row never rewrites another row's chosen days.
 */
export function saveRecurringLockWindow(
  current: readonly RecurringLockWindow[],
  candidate: RecurringLockWindow,
): SaveRecurringLockWindowResult {
  const normalized = normalize(candidate);
  if (normalized.ok === false) {
    return normalized;
  }

  const conflict = current.find(
    (existing) =>
      existing.id !== normalized.window.id &&
      windowsOverlap(existing, normalized.window),
  );
  if (conflict !== undefined) {
    return {
      ok: false,
      error: "overlap",
      conflictingWindowId: conflict.id,
    };
  }

  return {
    ok: true,
    windows: [
      ...current.filter(({ id }) => id !== normalized.window.id),
      normalized.window,
    ],
  };
}

function normalize(
  candidate: RecurringLockWindow,
):
  | { readonly ok: true; readonly window: RecurringLockWindow }
  | Exclude<SaveRecurringLockWindowResult, { readonly ok: true }> {
  const id = candidate.id.trim();
  if (id.length === 0) {
    return { ok: false, error: "invalidId" };
  }
  const days = WEEKDAYS.filter((day) => candidate.days.includes(day));
  if (days.length === 0) {
    return { ok: false, error: "noDays" };
  }
  if (
    !isMinuteOfDay(candidate.startMinute) ||
    !isMinuteOfDay(candidate.endMinute)
  ) {
    return { ok: false, error: "invalidTime" };
  }
  if (candidate.startMinute === candidate.endMinute) {
    return { ok: false, error: "emptyInterval" };
  }
  return {
    ok: true,
    window: Object.freeze({
      id,
      days: Object.freeze(days),
      startMinute: candidate.startMinute,
      endMinute: candidate.endMinute,
    }),
  };
}

function isMinuteOfDay(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value < MINUTES_PER_DAY;
}

function windowsOverlap(
  left: RecurringLockWindow,
  right: RecurringLockWindow,
): boolean {
  const leftSegments = weeklySegments(left);
  const rightSegments = weeklySegments(right);
  return leftSegments.some(([leftStart, leftEnd]) =>
    rightSegments.some(
      ([rightStart, rightEnd]) =>
        leftStart < rightEnd && rightStart < leftEnd,
    ),
  );
}

function weeklySegments(
  window: RecurringLockWindow,
): readonly (readonly [number, number])[] {
  const duration =
    window.endMinute > window.startMinute
      ? window.endMinute - window.startMinute
      : MINUTES_PER_DAY - window.startMinute + window.endMinute;

  return window.days.flatMap((day) => {
    const start = DAY_INDEX[day] * MINUTES_PER_DAY + window.startMinute;
    const end = start + duration;
    return end <= MINUTES_PER_WEEK
      ? ([[start, end]] as const)
      : ([
          [start, MINUTES_PER_WEEK],
          [0, end - MINUTES_PER_WEEK],
        ] as const);
  });
}

export function weekdayForWallClock(atMs: number): Weekday {
  const byUtcDay = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ] as const;
  return byUtcDay[new Date(atMs).getUTCDay()]!;
}
