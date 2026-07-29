import {
  saveRecurringLockWindow,
  type RecurringLockWindow,
} from "../recurringLockWindow";
import {
  isRecurringLockWindowActive,
  materializeLockWindows,
} from "../windowOccurrences";

const MINUTE_MS = 60_000;

function window(
  overrides: Partial<RecurringLockWindow> = {},
): RecurringLockWindow {
  return {
    id: "work-hours",
    days: ["monday"],
    startMinute: 9 * 60,
    endMinute: 11 * 60,
    ...overrides,
  };
}

/** A local wall-clock timestamp; UTC fields read it back without timezone drift. */
function wallTime(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute = 0,
): number {
  return Date.UTC(year, month - 1, day, hour, minute);
}

describe("recurring lock windows", () => {
  it("rejects overlap on any selected day while allowing touching boundaries", () => {
    const existing = [window()];

    expect(
      saveRecurringLockWindow(
        existing,
        window({
          id: "overlap",
          days: ["monday", "wednesday"],
          startMinute: 10 * 60,
          endMinute: 12 * 60,
        }),
      ),
    ).toEqual({
      ok: false,
      error: "overlap",
      conflictingWindowId: "work-hours",
    });

    expect(
      saveRecurringLockWindow(
        existing,
        window({
          id: "touching",
          startMinute: 11 * 60,
          endMinute: 12 * 60,
        }),
      ),
    ).toMatchObject({ ok: true });
  });

  it("detects overlap across midnight on the following day", () => {
    const overnight = window({
      id: "overnight",
      startMinute: 22 * 60,
      endMinute: 6 * 60,
    });

    expect(
      saveRecurringLockWindow(
        [overnight],
        window({
          id: "tuesday-early",
          days: ["tuesday"],
          startMinute: 5 * 60,
          endMinute: 7 * 60,
        }),
      ),
    ).toMatchObject({
      ok: false,
      error: "overlap",
      conflictingWindowId: "overnight",
    });

    expect(
      saveRecurringLockWindow(
        [overnight],
        window({
          id: "tuesday-after",
          days: ["tuesday"],
          startMinute: 6 * 60,
          endMinute: 7 * 60,
        }),
      ),
    ).toMatchObject({ ok: true });
  });

  it("rejects an equal start and end as an empty, ambiguous interval", () => {
    expect(
      saveRecurringLockWindow(
        [],
        window({ startMinute: 9 * 60, endMinute: 9 * 60 }),
      ),
    ).toEqual({ ok: false, error: "emptyInterval" });
  });

  it("lets an edit replace itself without reporting a self-overlap", () => {
    expect(
      saveRecurringLockWindow(
        [window()],
        window({ startMinute: 8 * 60, endMinute: 10 * 60 }),
      ),
    ).toEqual({
      ok: true,
      windows: [window({ startMinute: 8 * 60, endMinute: 10 * 60 })],
    });
  });

  it("keeps an overnight window active after midnight", () => {
    const overnight = window({
      startMinute: 22 * 60,
      endMinute: 6 * 60,
    });

    expect(
      isRecurringLockWindowActive(
        [overnight],
        wallTime(2026, 7, 27, 23),
      ),
    ).toBe(true);
    expect(
      isRecurringLockWindowActive(
        [overnight],
        wallTime(2026, 7, 28, 5, 59),
      ),
    ).toBe(true);
    expect(
      isRecurringLockWindowActive(
        [overnight],
        wallTime(2026, 7, 28, 6),
      ),
    ).toBe(false);
  });

  it("preserves local wall times across the spring DST transition", () => {
    const sunday = window({
      id: "sunday",
      days: ["sunday"],
      startMinute: 90,
      endMinute: 210,
    });
    const occurrences = materializeLockWindows(
      [sunday],
      wallTime(2026, 3, 8, 0),
      8,
    );

    expect(occurrences.slice(0, 2)).toEqual([
      {
        id: `recurring:sunday:${wallTime(2026, 3, 8, 1, 30)}`,
        startsAtMs: wallTime(2026, 3, 8, 1, 30),
        endsAtMs: wallTime(2026, 3, 8, 3, 30),
      },
      {
        id: `recurring:sunday:${wallTime(2026, 3, 15, 1, 30)}`,
        startsAtMs: wallTime(2026, 3, 15, 1, 30),
        endsAtMs: wallTime(2026, 3, 15, 3, 30),
      },
    ]);
    expect(occurrences[0]!.endsAtMs - occurrences[0]!.startsAtMs).toBe(
      120 * MINUTE_MS,
    );
  });
});
