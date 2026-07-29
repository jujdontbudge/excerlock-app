import type { DayRange } from "./selectors";

/**
 * Time Reclaimed (PRD §3.13, formula decided 2026-07-28).
 *
 * Baseline = `confessed_daily_minutes`, the fixed life-before-ExcerLock snapshot
 * taken in onboarding. Per-day saved = `max(0, baseline − locked-group usage)`,
 * **clamped at zero so a blowout day never subtracts** — sells-not-scolds applies
 * to the math too. One formula, three windows: month (hero), week (recap),
 * all-time (milestones); this function is the window-agnostic half.
 *
 * The clamp hides one fact, so it is kept rather than dropped: `overMinutes` is
 * the mirror sum, and `netMinutes` is the whole truth with its sign. A user who
 * spent more than they confessed reads that as a plain statement — never as a
 * zero that pretends, and never as a scolding.
 */
export type TimeReclaimed = {
  /**
   * `unconfessed` — onboarding was skipped, so there is no baseline to measure
   * against · `noBaseline` — a confession of zero (or nonsense): nothing to
   * reclaim from · `measured` — the formula ran.
   */
  status: "unconfessed" | "noBaseline" | "measured";
  baselineMinutes: number | null;
  /** Σ `max(0, baseline − usage)` — the PRD's hero number. Never negative. */
  reclaimedMinutes: number;
  /** Σ `max(0, usage − baseline)` — what the clamp left out. */
  overMinutes: number;
  /** `reclaimedMinutes − overMinutes`. Negative means the window ran over the confession. */
  netMinutes: number;
  /** Locked-group usage over the window, baseline or no baseline. */
  usageMinutes: number;
  dayCount: number;
  /** Days that came in under the confession. A day exactly on it is neither. */
  reclaimedDays: number;
  overDays: number;
};

function isBaseline(minutes: number | null): minutes is number {
  return minutes !== null && Number.isFinite(minutes) && minutes > 0;
}

/** Time Reclaimed over whatever window it is handed. Total: an empty range reads zero. */
export function selectTimeReclaimed(
  days: DayRange,
  baselineMinutes: number | null,
): TimeReclaimed {
  const usageMinutes = days.reduce((sum, day) => sum + day.usageMinutes, 0);
  const shell = {
    baselineMinutes,
    reclaimedMinutes: 0,
    overMinutes: 0,
    netMinutes: 0,
    usageMinutes,
    dayCount: days.length,
    reclaimedDays: 0,
    overDays: 0,
  };

  if (!isBaseline(baselineMinutes)) {
    return {
      ...shell,
      status: baselineMinutes === null ? "unconfessed" : "noBaseline",
      // A baseline of zero cannot be reclaimed *from*; reporting −usage against it
      // would be a scolding dressed as arithmetic.
      baselineMinutes: baselineMinutes === null ? null : baselineMinutes,
    };
  }

  const totals = days.reduce(
    (sum, day) => {
      const difference = baselineMinutes - day.usageMinutes;
      return {
        reclaimedMinutes: sum.reclaimedMinutes + Math.max(0, difference),
        overMinutes: sum.overMinutes + Math.max(0, -difference),
        reclaimedDays: sum.reclaimedDays + (difference > 0 ? 1 : 0),
        overDays: sum.overDays + (difference < 0 ? 1 : 0),
      };
    },
    { reclaimedMinutes: 0, overMinutes: 0, reclaimedDays: 0, overDays: 0 },
  );

  return {
    ...shell,
    ...totals,
    status: "measured",
    netMinutes: totals.reclaimedMinutes - totals.overMinutes,
  };
}
