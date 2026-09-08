/**
 * The `/v1/sync` wire contract, matched to the server's `server/src/sync/payload.ts` (P2-T02). Every wire
 * shape, field name and mapping lives here, so a disagreement with the server is a one-file fix.
 *
 * The server validates every object `.strict()`: an unexpected key rejects the whole batch. Keys are
 * camelCase, `mode` and `schedule` travel as the domain objects verbatim, rule ids are UUIDs. Row batches
 * travel under `rows`; rules under `rules`; the profile under `profile`. The Screen Time selection, the
 * warm-up rating and the paused-for-no-gym marker are device-only and never sent.
 *
 * Privacy law: nothing here may carry an app name, a bundle id, a coordinate, a gym place, a gym visit or
 * a health sample. `__tests__/privacy.test.ts` holds that line at the type level and over this source.
 */
import { EarnedUnlock, Profile, Rule, RuleDay } from '../../domain/types';
import { HistoryDay } from '../../ports/models';
import { RuleTombstone, SealedHistoryDay, Stamped, SyncSnapshot, UsageDay } from '../../ports/SyncPort';

export const MAX_BATCH = 400;
/** The server's cap on every free-text column (profile fields, rule names); longer values are cut, not rejected. */
export const MAX_TEXT = 120;

export const paths = {
  rules: '/v1/sync/rules',
  ruleDays: '/v1/sync/rule-days',
  usageDays: '/v1/sync/usage-days',
  earnedUnlocks: '/v1/sync/earned-unlocks',
  history: '/v1/sync/history',
  profile: '/v1/sync/profile',
  pull: '/v1/sync',
} as const;

/** The body field each endpoint reads its batch from. */
export const batchField = { rules: 'rules', rows: 'rows', profile: 'profile' } as const;

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
  unit?: NonNullable<RuleDay['unit']> | null;
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
export type WireHistoryDay = {
  day: string;
  usageMinutes: number | null;
  activity: HistoryDay['activity'];
  met: boolean;
  scheduled: boolean;
  sealedAt: string;
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
export type WireRowsBody<T> = { rows: T[] };
export type WireProfileBody = { profile: WireProfile };
export type WirePull = {
  rules: WireRule[];
  ruleDays: WireRuleDay[];
  usageDays: WireUsageDay[];
  earnedUnlocks: WireEarnedUnlock[];
  historyDays: WireHistoryDay[];
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
    unit: row.unit ?? null,
    updatedAt: row.updatedAt,
  }),
  usageDay: (row: Stamped<UsageDay>): WireUsageDay => ({
    day: row.day,
    lockedAppMinutes: minutes(row.lockedAppMinutes),
    updatedAt: row.updatedAt,
  }),
  earnedUnlock: (row: Stamped<EarnedUnlock>): WireEarnedUnlock => ({
    day: row.day,
    ruleId: row.ruleId,
    ruleName: capped(row.ruleName),
    metAt: row.metAt,
    windowEnd: row.windowEnd,
    updatedAt: row.updatedAt,
  }),
  historyDay: (row: Stamped<SealedHistoryDay>): WireHistoryDay => ({
    day: row.day,
    usageMinutes: row.usageMinutes === null ? null : minutes(row.usageMinutes),
    activity: row.activity,
    met: row.met,
    scheduled: row.scheduled,
    sealedAt: row.sealedAt,
    updatedAt: row.updatedAt,
  }),
  profile: (profile: Stamped<Profile>): WireProfile => ({
    name: capped(profile.name),
    referralSource: capped(profile.referralSource),
    ageBand: capped(profile.ageBand),
    occupation: capped(profile.occupation),
    improveFirst: profile.improveFirst,
    mainReason: capped(profile.mainReason),
    estimatedDailyMinutes: minutes(profile.estimatedDailyMinutes),
    units: profile.units,
    updatedAt: profile.updatedAt,
  }),
};

const text = (value: string | null | undefined) => value ?? '';
const capped = (value: string) => value.slice(0, MAX_TEXT);
/** Minute columns are integers server-side; a fractional measurement rounds rather than rejects the batch. */
const minutes = (value: number) => Math.max(0, Math.round(value));

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
    ...(wire.unit ? { unit: wire.unit } : {}),
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
  historyDay: (wire: WireHistoryDay): Stamped<SealedHistoryDay> => ({
    day: wire.day,
    usageMinutes: wire.usageMinutes,
    activity: wire.activity,
    met: wire.met,
    scheduled: wire.scheduled,
    sealedAt: wire.sealedAt,
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
    history: wire.historyDays.map(fromWire.historyDay),
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
    historyDays: list(value.historyDays),
    profile: value.profile ?? null,
  };
}
