/**
 * The `/v1/sync` wire contract, matched to the server's `server/src/sync/payload.ts` (P2-T02). Every wire
 * shape and every field mapping lives here, so a disagreement with the server is a one-file fix.
 *
 * The server validates every object `.strict()`: an unexpected key rejects the whole batch. Keys are
 * camelCase, `mode` and `schedule` travel as the domain objects verbatim, rule ids are UUIDs. The Screen
 * Time selection, the warm-up rating, the rule day's display unit and the paused-for-no-gym marker are
 * device-only and never sent. Sealed history days have no server table; only usage minutes travel.
 *
 * Privacy law: nothing here may carry an app name, a bundle id, a coordinate, a gym place, a gym visit or
 * a health sample. `__tests__/privacy.test.ts` holds that line at the type level and over this source.
 */
import { EarnedUnlock, Profile, Rule, RuleDay } from '../../domain/types';
import { RuleTombstone, Stamped, SyncSnapshot, UsageDay } from '../../ports/SyncPort';

export const MAX_BATCH = 400;

export const paths = {
  rules: '/v1/sync/rules',
  ruleDays: '/v1/sync/rule-days',
  usageDays: '/v1/sync/usage-days',
  earnedUnlocks: '/v1/sync/earned-unlocks',
  profile: '/v1/sync/profile',
  pull: '/v1/sync',
} as const;

export type WireRule = {
  id: string;
  activity: Rule['activity'];
  mode: Rule['mode'];
  schedule: Rule['schedule'];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};
export type WireRuleDay = {
  ruleId: string;
  day: string;
  progress: number;
  met: boolean;
  metAt?: string | null;
  updatedAt: string;
};
export type WireUsageDay = { day: string; lockedAppMinutes: number; updatedAt: string };
export type WireEarnedUnlock = {
  day: string;
  ruleId: string;
  ruleName: string;
  metAt: string;
  windowEnd: string;
  updatedAt: string;
};
export type WireProfile = {
  name?: string | null;
  referralSource?: string | null;
  ageBand?: string | null;
  occupation?: string | null;
  improveFirst?: Profile['improveFirst'] | null;
  mainReason?: string | null;
  estimatedDailyMinutes?: number | null;
  units?: Profile['units'] | null;
  updatedAt: string;
};

export type WireRulesBody = { rules: WireRule[] };
export type WireRuleDaysBody = { ruleDays: WireRuleDay[] };
export type WireUsageDaysBody = { usageDays: WireUsageDay[] };
export type WireEarnedUnlocksBody = { earnedUnlocks: WireEarnedUnlock[] };
export type WireProfileBody = { profile: WireProfile };
export type WirePull = {
  rules: WireRule[];
  ruleDays: WireRuleDay[];
  usageDays: WireUsageDay[];
  earnedUnlocks: WireEarnedUnlock[];
  profile: WireProfile | null;
};

export const toWire = {
  rule: (rule: Rule): WireRule => ({
    id: rule.id,
    activity: rule.activity,
    mode: rule.mode,
    schedule: rule.schedule,
    enabled: rule.enabled,
    createdAt: rule.createdAt,
    updatedAt: rule.updatedAt,
    deletedAt: null,
  }),
  tombstone: (rule: Rule, deletedAt: string): WireRule => ({ ...toWire.rule(rule), updatedAt: deletedAt, deletedAt }),
  ruleDay: (row: Stamped<RuleDay>): WireRuleDay => ({
    ruleId: row.ruleId,
    day: row.day,
    progress: row.progress,
    met: row.met,
    metAt: row.metAt,
    updatedAt: row.updatedAt,
  }),
  usageDay: (row: Stamped<UsageDay>): WireUsageDay => ({
    day: row.day,
    lockedAppMinutes: row.lockedAppMinutes,
    updatedAt: row.updatedAt,
  }),
  earnedUnlock: (row: Stamped<EarnedUnlock>): WireEarnedUnlock => ({
    day: row.day,
    ruleId: row.ruleId,
    ruleName: row.ruleName,
    metAt: row.metAt,
    windowEnd: row.windowEnd,
    updatedAt: row.updatedAt,
  }),
  profile: (profile: Stamped<Profile>): WireProfile => ({
    name: profile.name,
    referralSource: profile.referralSource,
    ageBand: profile.ageBand,
    occupation: profile.occupation,
    improveFirst: profile.improveFirst,
    mainReason: profile.mainReason,
    estimatedDailyMinutes: profile.estimatedDailyMinutes,
    units: profile.units,
    updatedAt: profile.updatedAt,
  }),
};

const text = (value: string | null | undefined) => value ?? '';

export const fromWire = {
  rule: (wire: WireRule): Rule => ({
    id: wire.id,
    activity: wire.activity,
    mode: wire.mode,
    schedule: wire.schedule,
    enabled: wire.enabled,
    createdAt: wire.createdAt,
    updatedAt: wire.updatedAt,
  }),
  ruleDay: (wire: WireRuleDay): Stamped<RuleDay> => ({
    ruleId: wire.ruleId,
    day: wire.day,
    progress: wire.progress,
    met: wire.met,
    metAt: wire.metAt ?? null,
    updatedAt: wire.updatedAt,
  }),
  usageDay: (wire: WireUsageDay): Stamped<UsageDay> => ({
    day: wire.day,
    lockedAppMinutes: wire.lockedAppMinutes,
    updatedAt: wire.updatedAt,
  }),
  earnedUnlock: (wire: WireEarnedUnlock): Stamped<EarnedUnlock> => ({
    day: wire.day,
    ruleId: wire.ruleId,
    ruleName: wire.ruleName,
    metAt: wire.metAt,
    windowEnd: wire.windowEnd,
    updatedAt: wire.updatedAt,
  }),
  /** Server columns are nullable; a null reads as the profile's blank value so the store validators accept it. */
  profile: (wire: WireProfile, defaults: Pick<Profile, 'estimatedDailyMinutes' | 'units'>): Stamped<Profile> => ({
    name: text(wire.name),
    referralSource: text(wire.referralSource),
    ageBand: text(wire.ageBand),
    occupation: text(wire.occupation),
    improveFirst: wire.improveFirst ?? 'exercise',
    mainReason: text(wire.mainReason),
    estimatedDailyMinutes: wire.estimatedDailyMinutes ?? defaults.estimatedDailyMinutes,
    units: wire.units ?? defaults.units,
    updatedAt: wire.updatedAt,
  }),
  snapshot: (wire: WirePull, defaults: Pick<Profile, 'estimatedDailyMinutes' | 'units'>): SyncSnapshot => ({
    rules: wire.rules.filter((rule) => !rule.deletedAt).map(fromWire.rule),
    tombstones: wire.rules.flatMap((rule): RuleTombstone[] => (rule.deletedAt ? [{ id: rule.id, deletedAt: rule.deletedAt }] : [])),
    ruleDays: wire.ruleDays.map(fromWire.ruleDay),
    usageDays: wire.usageDays.map(fromWire.usageDay),
    earnedUnlocks: wire.earnedUnlocks.map(fromWire.earnedUnlock),
    profile: wire.profile ? fromWire.profile(wire.profile, defaults) : null,
  }),
};

/** A pull body is untrusted input: absent collections read as empty rather than throwing at the boundary. */
export function readPull(body: unknown): WirePull {
  const value = (typeof body === 'object' && body !== null ? body : {}) as Partial<WirePull>;
  const list = <T>(rows: T[] | undefined): T[] => (Array.isArray(rows) ? rows : []);
  return {
    rules: list(value.rules),
    ruleDays: list(value.ruleDays),
    usageDays: list(value.usageDays),
    earnedUnlocks: list(value.earnedUnlocks),
    profile: value.profile ?? null,
  };
}
