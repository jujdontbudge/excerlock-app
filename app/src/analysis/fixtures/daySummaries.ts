import {
  DAY_MS,
  MIN_MS,
  RATE_STREAK_FLOOR_MINUTES,
  STATE_STREAK_FLOOR_MINUTES,
  type ConditionDaySummary,
  type DaySummary,
} from "@excerlock/ledger";

/**
 * Three whole weeks of a plausible ExcerLock user, shaped exactly like what
 * `daySummaries()` returns. Phase 2 builds UI on mocks (ARCHITECTURE §6), so the
 * screen reads this; swapping in the real store is a one-line change at the
 * screen's `days` prop.
 *
 * The rows below are the story. Everything else — balances, rollover, the §3.13
 * meaningful-activity verdicts — is *derived* here with the same identities the
 * package guarantees, so the fixture can never drift into a state the ledger
 * would refuse to produce.
 */

/** Mirrors the shape `LedgerConfig` takes for this user: 4 AM boundary, 30 min/day, 60 min cap. */
export const FIXTURE_LEDGER_CONFIG = {
  dayBoundaryOffsetMinutes: 4 * 60,
  baseAllowanceMinutes: 30,
  rolloverCapMinutes: 60,
} as const;

/** The fixture's conditions exercise every kind and both banked reward families. */
export const FIXTURE_CONDITIONS = {
  gym: { id: "gym-visit", label: "Gym visit" },
  run: { id: "morning-run", label: "Morning run" },
  steps: { id: "steps-exchange", label: "Steps exchange" },
  desk: { id: "standing-desk", label: "Standing desk" },
} as const;

/** Monday 6 July 2026 — the fixture's first day, so day 21 lands on a Sunday. */
const FIRST_DAY_INDEX = Date.UTC(2026, 6, 6) / DAY_MS;

type Row = {
  /** Minutes banked that day. */
  earned: number;
  /** Minutes actually deducted — never more than the day had available. */
  spent: number;
  /** Gym check-ins (event condition). */
  gymEvents?: number;
  /** Minutes of running credited (rate condition). */
  runMinutes?: number;
  /** Minutes credited by a second rate condition on standing-desk days. */
  stepsMinutes?: number;
  /** Sustained standing minutes (state condition). */
  deskMinutes?: number;
};

/**
 * Week 1 finds its feet, week 2 is a clean eight-day run that carries into week 3's
 * Monday, and week 3 stumbles once before a five-day run reaches today. Three quiet
 * days burn the balance to exactly zero — the shield-goes-up moment.
 */
const ROWS: readonly Row[] = [
  // Week 1 — Mon 6 Jul → Sun 12 Jul
  { earned: 22, spent: 44, runMinutes: 22 },
  { earned: 45, spent: 70, gymEvents: 1 },
  { earned: 0, spent: 43 },
  { earned: 13, spent: 40, stepsMinutes: 13, deskMinutes: 26 },
  { earned: 45, spent: 55, gymEvents: 1 },
  { earned: 31, spent: 61, runMinutes: 31 },
  { earned: 0, spent: 53 },
  // Week 2 — Mon 13 Jul → Sun 19 Jul, every day meaningful
  { earned: 18, spent: 40, runMinutes: 18 },
  { earned: 45, spent: 62, gymEvents: 1 },
  { earned: 11, spent: 51, stepsMinutes: 11, deskMinutes: 22 },
  { earned: 26, spent: 58, runMinutes: 26 },
  { earned: 61, spent: 70, gymEvents: 1, runMinutes: 16 },
  { earned: 40, spent: 65, runMinutes: 40 },
  { earned: 17, spent: 72, stepsMinutes: 17, deskMinutes: 34 },
  // Week 3 — Mon 20 Jul → Sun 26 Jul (today)
  { earned: 45, spent: 44, gymEvents: 1 },
  { earned: 0, spent: 71 },
  { earned: 24, spent: 34, runMinutes: 24 },
  { earned: 45, spent: 60, gymEvents: 1 },
  { earned: 9, spent: 62, stepsMinutes: 9, deskMinutes: 18 },
  { earned: 78, spent: 56, gymEvents: 1, runMinutes: 33 },
  { earned: 20, spent: 47, runMinutes: 20 },
];

function condition(totals: Partial<ConditionDaySummary>): ConditionDaySummary {
  const eventsFired = totals.eventsFired ?? 0;
  const rateMinutes = totals.rateMinutes ?? 0;
  const stateSustainedMinutes = totals.stateSustainedMinutes ?? 0;

  return {
    eventsFired,
    rateMinutes,
    stateSustainedMinutes,
    earnedMinutes: totals.earnedMinutes ?? 0,
    // The same predicate `summary.ts` applies, read off the package's own floors.
    meaningfulActivity:
      eventsFired > 0 ||
      rateMinutes >= RATE_STREAK_FLOOR_MINUTES ||
      stateSustainedMinutes >= STATE_STREAK_FLOOR_MINUTES,
  };
}

function conditionsFor(row: Row): Record<string, ConditionDaySummary> {
  const conditions: Record<string, ConditionDaySummary> = {};
  if (row.gymEvents !== undefined)
    conditions[FIXTURE_CONDITIONS.gym.id] = condition({
      eventsFired: row.gymEvents,
      earnedMinutes: row.gymEvents * 45,
    });
  if (row.runMinutes !== undefined)
    conditions[FIXTURE_CONDITIONS.run.id] = condition({
      rateMinutes: row.runMinutes,
      earnedMinutes: row.runMinutes,
    });
  if (row.stepsMinutes !== undefined)
    conditions[FIXTURE_CONDITIONS.steps.id] = condition({
      rateMinutes: row.stepsMinutes,
      earnedMinutes: row.stepsMinutes,
    });
  if (row.deskMinutes !== undefined)
    conditions[FIXTURE_CONDITIONS.desk.id] = condition({
      stateSustainedMinutes: row.deskMinutes,
    });
  return conditions;
}

function buildDaySummaries(rows: readonly Row[]): DaySummary[] {
  const { baseAllowanceMinutes, rolloverCapMinutes, dayBoundaryOffsetMinutes } =
    FIXTURE_LEDGER_CONFIG;
  let rolloverIn = 0;

  return rows.map((row, offset) => {
    const dayIndex = FIRST_DAY_INDEX + offset;
    const startBalance = baseAllowanceMinutes + rolloverIn;
    // The ledger clamps at zero; the rows are authored never to overspend, and
    // `__tests__/fixtures.test.ts` holds them to it.
    const endBalance = Math.max(0, startBalance + row.earned - row.spent);
    const conditions = conditionsFor(row);
    const meaningfulConditionCount = Object.values(conditions).filter(
      (c) => c.meaningfulActivity,
    ).length;

    const summary: DaySummary = {
      dayIndex,
      dayStartMs: dayIndex * DAY_MS + dayBoundaryOffsetMinutes * MIN_MS,
      baseAllowance: baseAllowanceMinutes,
      rolloverIn,
      startBalance,
      endBalance,
      earnedMinutes: row.earned,
      spentMinutes: row.spent,
      // No holidays in this fixture, so usage is exactly what was deducted.
      usageMinutes: row.spent,
      holidays: [],
      conditions,
      meaningfulActivity: meaningfulConditionCount > 0,
      meaningfulConditionCount,
    };

    rolloverIn = Math.min(endBalance, rolloverCapMinutes);
    return summary;
  });
}

/** 21 ascending, contiguous days — Mon 6 Jul 2026 through Sun 26 Jul 2026. */
export const FIXTURE_DAY_SUMMARIES: readonly DaySummary[] = buildDaySummaries(ROWS);

/** What a day-zero user's Analysis reads: nothing has been recorded yet. */
export const EMPTY_DAY_SUMMARIES: readonly DaySummary[] = [];
