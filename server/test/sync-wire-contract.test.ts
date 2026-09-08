import { describe, expect, it } from "vitest";
import {
  earnedUnlocksRequest,
  historyDaysRequest,
  profileRequest,
  ruleDaysRequest,
  rulePayload,
  rulesRequest,
  usageDaysRequest,
} from "../src/sync/index.js";

/**
 * The client's wire file (`app-next/src/adapters/sync/wire.ts`) is written to
 * mirror `src/sync/payload.ts`, and the two are edited by different lanes. A
 * disagreement rejects a whole batch with a 400 at runtime, which is a silent
 * backup failure rather than a visible crash — so the shapes that file
 * encodes are pinned here, at this end, as executable statements.
 */

const BASE_RULE = {
  id: "11111111-1111-4111-8111-111111111111",
  activity: "walking",
  schedule: { days: [1, 2, 3, 4, 5], window: { kind: "allDay" } },
  enabled: true,
  createdAt: "2026-09-01T12:00:00.000Z",
  updatedAt: "2026-09-01T12:00:00.000Z",
};

/** Every variant of the client's `RuleMode`, in its declaration order. */
const CLIENT_RULE_MODES = [
  { kind: "target", activity: "walking", metric: "steps", goal: 5_000, place: "outside" },
  { kind: "target", activity: "walking", metric: "minutes", goal: 30, place: "either" },
  { kind: "state", activity: "walking", place: "treadmill" },
  { kind: "event", activity: "gym", trigger: "arrival" },
  { kind: "target", activity: "gym", metric: "minutes", goal: 45 },
  { kind: "target", activity: "running", metric: "minutes", goal: 20 },
  { kind: "target", activity: "running", metric: "distance", goal: 5, unit: "km" },
  { kind: "target", activity: "biking", metric: "minutes", goal: 40 },
  { kind: "target", activity: "biking", metric: "distance", goal: 12, unit: "mi" },
] as const;

describe("the client wire contract", () => {
  it("accepts every rule mode the client's domain can produce", () => {
    const rejected = CLIENT_RULE_MODES.filter(
      (mode) => !rulePayload.safeParse({ ...BASE_RULE, mode }).success,
    );

    // Named individually: one unsupported mode rejects the user's whole rule
    // batch, so "most of them parse" is not the property worth having.
    expect(rejected).toEqual([]);
  });

  it("accepts a midnight-crossing window, which the client treats as valid", () => {
    const crossesMidnight = rulePayload.safeParse({
      ...BASE_RULE,
      mode: CLIENT_RULE_MODES[0],
      schedule: {
        days: [5, 6],
        window: { kind: "range", startMinute: 1_320, endMinute: 120 },
      },
    });

    expect(crossesMidnight.success).toBe(true);
  });

  it("accepts a whole rule carrying a deletion tombstone", () => {
    const tombstone = rulePayload.safeParse({
      ...BASE_RULE,
      mode: CLIENT_RULE_MODES[0],
      updatedAt: "2026-09-04T12:00:00.000Z",
      deletedAt: "2026-09-04T12:00:00.000Z",
    });

    expect(tombstone.success).toBe(true);
  });

  it("reads each batch from the field name the client sends it under", () => {
    const parsedFields = {
      rules: rulesRequest.safeParse({
        rules: [{ ...BASE_RULE, mode: CLIENT_RULE_MODES[0], deletedAt: null }],
      }).success,
      ruleDays: ruleDaysRequest.safeParse({
        rows: [
          {
            ruleId: BASE_RULE.id,
            day: "2026-09-01",
            progress: 5_200,
            met: true,
            metAt: "2026-09-01T15:00:00.000Z",
            unit: "steps",
            updatedAt: "2026-09-01T15:00:00.000Z",
          },
        ],
      }).success,
      usageDays: usageDaysRequest.safeParse({
        rows: [
          {
            day: "2026-09-01",
            lockedAppMinutes: 90,
            updatedAt: "2026-09-01T23:00:00.000Z",
          },
        ],
      }).success,
      earnedUnlocks: earnedUnlocksRequest.safeParse({
        rows: [
          {
            day: "2026-09-01",
            ruleId: BASE_RULE.id,
            ruleName: "Walk 5,000 steps",
            metAt: "2026-09-01T15:00:00.000Z",
            windowEnd: "2026-09-01T21:00:00.000Z",
            updatedAt: "2026-09-01T15:00:00.000Z",
          },
        ],
      }).success,
      history: historyDaysRequest.safeParse({
        rows: [
          {
            day: "2026-09-01",
            usageMinutes: null,
            activity: { walking: 5_200, gym: 0, running: 0, biking: 0 },
            met: true,
            scheduled: true,
            sealedAt: "2026-09-02T04:00:00.000Z",
            updatedAt: "2026-09-02T04:00:00.000Z",
          },
        ],
      }).success,
      profile: profileRequest.safeParse({
        profile: {
          name: "Person",
          referralSource: "tiktok",
          ageBand: "25-34",
          occupation: "student",
          improveFirst: "screenTime",
          mainReason: "focus",
          estimatedDailyMinutes: 180,
          units: "mi",
          updatedAt: "2026-09-02T12:00:00.000Z",
        },
      }).success,
    };

    expect(parsedFields).toEqual({
      rules: true,
      ruleDays: true,
      usageDays: true,
      earnedUnlocks: true,
      history: true,
      profile: true,
    });
  });

  it("rejects a row batch sent under the collection's own name", () => {
    // The client used to send `{ ruleDays: [...] }`. Both lanes moved to
    // `rows`; this fails loudly if either drifts back.
    expect(ruleDaysRequest.safeParse({ ruleDays: [] }).success).toBe(false);
  });

  it("caps free text at the 120 the client truncates to", () => {
    const overLong = "x".repeat(121);

    expect({
      name: profileRequest.safeParse({
        profile: { name: overLong, updatedAt: "2026-09-02T12:00:00.000Z" },
      }).success,
      ruleName: earnedUnlocksRequest.safeParse({
        rows: [
          {
            day: "2026-09-01",
            ruleId: BASE_RULE.id,
            ruleName: overLong,
            metAt: "2026-09-01T15:00:00.000Z",
            windowEnd: "2026-09-01T21:00:00.000Z",
            updatedAt: "2026-09-01T15:00:00.000Z",
          },
        ],
      }).success,
    }).toEqual({ name: false, ruleName: false });
  });

  it("never accepts the device-only fields the client withholds", () => {
    const warmupRating = profileRequest.safeParse({
      profile: { warmupRating: 4, updatedAt: "2026-09-02T12:00:00.000Z" },
    });
    const selection = rulePayload.safeParse({
      ...BASE_RULE,
      mode: CLIENT_RULE_MODES[0],
      lockedApps: { appCount: 4, categoryCount: 1 },
    });

    expect({
      warmupRating: warmupRating.success,
      selection: selection.success,
    }).toEqual({ warmupRating: false, selection: false });
  });
});
