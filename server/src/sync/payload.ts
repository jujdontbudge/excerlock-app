import { z } from "zod";

/**
 * One batch limit for every sync endpoint. The device pushes rule days and
 * usage days in pages; rules and earned unlocks are always far below it.
 */
export const MAX_SYNC_BATCH = 400;

/** How much history `GET /v1/sync` hands a new device. */
export const SYNC_HISTORY_LIMIT = 400;

const isoInstant = z.iso.datetime({ offset: true });
const dayKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");
const uuid = z.uuid();
const weekday = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
]);
const walkPlace = z.enum(["outside", "treadmill", "either"]);
const distanceUnit = z.enum(["km", "mi"]);
const goal = z.number().finite().positive();

/**
 * `mode` and `schedule` are validated structurally rather than waved through
 * as opaque JSON. Every object is `.strict()`, which is what enforces the
 * privacy law at the boundary: an app name, a bundle id, a latitude or a gym
 * label has no field to arrive in, and the request is rejected rather than
 * quietly stored. The shapes are the product model's `RuleMode` and
 * `Schedule`; adding a mode to the app means adding it here too.
 */
const ruleMode = z.union([
  z
    .object({
      kind: z.literal("target"),
      activity: z.literal("walking"),
      metric: z.enum(["steps", "minutes"]),
      goal,
      place: walkPlace,
    })
    .strict(),
  z
    .object({
      kind: z.literal("target"),
      activity: z.literal("gym"),
      metric: z.literal("minutes"),
      goal,
    })
    .strict(),
  z
    .object({
      kind: z.literal("target"),
      activity: z.enum(["running", "biking"]),
      metric: z.literal("minutes"),
      goal,
    })
    .strict(),
  z
    .object({
      kind: z.literal("target"),
      activity: z.enum(["running", "biking"]),
      metric: z.literal("distance"),
      goal,
      unit: distanceUnit,
    })
    .strict(),
  z
    .object({
      kind: z.literal("state"),
      activity: z.literal("walking"),
      place: walkPlace,
    })
    .strict(),
  z
    .object({
      kind: z.literal("event"),
      activity: z.literal("gym"),
      trigger: z.literal("arrival"),
    })
    .strict(),
]);

const minuteOfDay = z.number().int().min(0).max(1_439);

const schedule = z
  .object({
    days: z.array(weekday).min(1).max(7),
    window: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("allDay") }).strict(),
      z
        .object({
          kind: z.literal("range"),
          startMinute: minuteOfDay,
          endMinute: minuteOfDay,
        })
        .strict(),
    ]),
  })
  .strict();

export const rulePayload = z
  .object({
    id: uuid,
    activity: z.enum(["walking", "gym", "running", "biking"]),
    mode: ruleMode,
    schedule,
    enabled: z.boolean(),
    createdAt: isoInstant,
    updatedAt: isoInstant,
    deletedAt: isoInstant.nullish(),
    /**
     * Accepted so a paused-for-no-gym rule is not rejected, and deliberately
     * not stored: gyms never leave the device, so the server could not restore
     * the reason's meaning. The device re-derives it from its own gym list.
     */
    pausedReason: z.literal("noGym").nullish(),
  })
  .strict();

export const ruleDayPayload = z
  .object({
    ruleId: uuid,
    day: dayKey,
    /** An aggregate in the rule's own unit. Never a sample series. */
    progress: z.number().finite().min(0),
    met: z.boolean(),
    metAt: isoInstant.nullish(),
    updatedAt: isoInstant,
  })
  .strict();

export const usageDayPayload = z
  .object({
    day: dayKey,
    /** Total minutes on the locked selection. The selection itself never syncs. */
    lockedAppMinutes: z.number().int().min(0),
    updatedAt: isoInstant,
  })
  .strict();

export const earnedUnlockPayload = z
  .object({
    day: dayKey,
    ruleId: uuid,
    ruleName: z.string().min(1).max(120),
    metAt: isoInstant,
    windowEnd: isoInstant,
    updatedAt: isoInstant,
  })
  .strict();

export const profilePayload = z
  .object({
    name: z.string().max(120).nullish(),
    referralSource: z.string().max(120).nullish(),
    ageBand: z.string().max(120).nullish(),
    occupation: z.string().max(120).nullish(),
    improveFirst: z.enum(["exercise", "screenTime", "wellness"]).nullish(),
    mainReason: z.string().max(120).nullish(),
    estimatedDailyMinutes: z.number().int().min(0).max(1_440).nullish(),
    units: distanceUnit.nullish(),
    updatedAt: isoInstant,
  })
  .strict();

function batch<Schema extends z.ZodTypeAny>(schema: Schema) {
  return z.array(schema).max(MAX_SYNC_BATCH);
}

export const rulesRequest = z
  .object({ rules: batch(rulePayload) })
  .strict();
export const ruleDaysRequest = z
  .object({ ruleDays: batch(ruleDayPayload) })
  .strict();
export const usageDaysRequest = z
  .object({ usageDays: batch(usageDayPayload) })
  .strict();
export const earnedUnlocksRequest = z
  .object({ earnedUnlocks: batch(earnedUnlockPayload) })
  .strict();
export const profileRequest = z
  .object({ profile: profilePayload })
  .strict();

export type RulePayload = z.infer<typeof rulePayload>;
export type RuleDayPayload = z.infer<typeof ruleDayPayload>;
export type UsageDayPayload = z.infer<typeof usageDayPayload>;
export type EarnedUnlockPayload = z.infer<typeof earnedUnlockPayload>;
export type ProfilePayload = z.infer<typeof profilePayload>;

export interface SyncSnapshot {
  rules: RulePayload[];
  ruleDays: RuleDayPayload[];
  usageDays: UsageDayPayload[];
  earnedUnlocks: EarnedUnlockPayload[];
  profile: ProfilePayload | null;
}

/** What a write endpoint reports back, for the device's sync log. */
export interface SyncWriteResult {
  /** Rows whose `updatedAt` was newer than the stored row, so they landed. */
  applied: number;
  /** Rows the server already held a newer copy of, or does not own. */
  skipped: number;
}

export interface RuleSyncWriteResult extends SyncWriteResult {
  /** Rules the device no longer has, tombstoned by this full replacement. */
  tombstoned: number;
}
