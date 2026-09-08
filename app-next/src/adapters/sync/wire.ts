/**
 * The `/v1/sync` wire contract (P2-T02 §3–4). Every wire shape and every field mapping lives here, so a
 * disagreement with the server is a one-file fix. Keys are snake_case; `mode` and `schedule` travel as
 * the domain objects verbatim.
 *
 * Privacy law: nothing here may carry an app name, a bundle id, a coordinate, a gym place, a gym visit or
 * a health sample. `__tests__/privacy.test.ts` holds that line at the type level and over this source.
 */
import { EarnedUnlock, Profile, Rule, RuleDay } from '../../domain/types';
import { HistoryDay } from '../../ports/models';
import { RuleTombstone, SealedHistoryDay, Stamped, SyncSnapshot, UsageDay } from '../../ports/SyncPort';

export const MAX_BATCH = 400;

export const paths = {
  rules: '/v1/sync/rules',
  ruleDays: '/v1/sync/rule-days',
  usageDays: '/v1/sync/usage-days',
  earnedUnlocks: '/v1/sync/earned-unlocks',
  history: '/v1/sync/history',
  profile: '/v1/sync/profile',
  pull: '/v1/sync',
} as const;

export type WireRule = {
  id: string;
  activity: Rule['activity'];
  mode: Rule['mode'];
  schedule: Rule['schedule'];
  enabled: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};
export type WireRuleDay = {
  rule_id: string;
  day: string;
  progress: number;
  met: boolean;
  met_at: string | null;
  unit: NonNullable<RuleDay['unit']> | null;
  updated_at: string;
};
export type WireUsageDay = { day: string; locked_app_minutes: number; updated_at: string };
export type WireEarnedUnlock = {
  rule_id: string;
  day: string;
  rule_name: string;
  met_at: string;
  window_end: string;
  updated_at: string;
};
export type WireHistoryDay = {
  day: string;
  usage_minutes: number | null;
  activity: HistoryDay['activity'];
  met: boolean;
  scheduled: boolean;
  sealed_at: string;
  updated_at: string;
};
export type WireProfile = {
  name: string;
  referral_source: string;
  age_band: string;
  occupation: string;
  improve_first: Profile['improveFirst'];
  main_reason: string;
  estimated_daily_minutes: number;
  units: Profile['units'];
  updated_at: string;
};

export type WireRulesBody = { rules: WireRule[] };
export type WireRowsBody<T> = { rows: T[] };
export type WireProfileBody = { profile: WireProfile };
export type WirePull = {
  rules: WireRule[];
  rule_days: WireRuleDay[];
  usage_days: WireUsageDay[];
  earned_unlocks: WireEarnedUnlock[];
  history: WireHistoryDay[];
  profile: WireProfile | null;
};

export const toWire = {
  rule: (rule: Rule): WireRule => ({
    id: rule.id,
    activity: rule.activity,
    mode: rule.mode,
    schedule: rule.schedule,
    enabled: rule.enabled,
    created_at: rule.createdAt,
    updated_at: rule.updatedAt,
    deleted_at: null,
  }),
  tombstone: (rule: Rule, deletedAt: string): WireRule => ({ ...toWire.rule(rule), updated_at: deletedAt, deleted_at: deletedAt }),
  ruleDay: (row: Stamped<RuleDay>): WireRuleDay => ({
    rule_id: row.ruleId,
    day: row.day,
    progress: row.progress,
    met: row.met,
    met_at: row.metAt,
    unit: row.unit ?? null,
    updated_at: row.updatedAt,
  }),
  usageDay: (row: Stamped<UsageDay>): WireUsageDay => ({
    day: row.day,
    locked_app_minutes: row.lockedAppMinutes,
    updated_at: row.updatedAt,
  }),
  earnedUnlock: (row: Stamped<EarnedUnlock>): WireEarnedUnlock => ({
    rule_id: row.ruleId,
    day: row.day,
    rule_name: row.ruleName,
    met_at: row.metAt,
    window_end: row.windowEnd,
    updated_at: row.updatedAt,
  }),
  historyDay: (row: Stamped<SealedHistoryDay>): WireHistoryDay => ({
    day: row.day,
    usage_minutes: row.usageMinutes,
    activity: row.activity,
    met: row.met,
    scheduled: row.scheduled,
    sealed_at: row.sealedAt,
    updated_at: row.updatedAt,
  }),
  profile: (profile: Stamped<Profile>): WireProfile => ({
    name: profile.name,
    referral_source: profile.referralSource,
    age_band: profile.ageBand,
    occupation: profile.occupation,
    improve_first: profile.improveFirst,
    main_reason: profile.mainReason,
    estimated_daily_minutes: profile.estimatedDailyMinutes,
    units: profile.units,
    updated_at: profile.updatedAt,
  }),
};

export const fromWire = {
  rule: (wire: WireRule): Rule => ({
    id: wire.id,
    activity: wire.activity,
    mode: wire.mode,
    schedule: wire.schedule,
    enabled: wire.enabled,
    createdAt: wire.created_at,
    updatedAt: wire.updated_at,
  }),
  ruleDay: (wire: WireRuleDay): Stamped<RuleDay> => ({
    ruleId: wire.rule_id,
    day: wire.day,
    progress: wire.progress,
    met: wire.met,
    metAt: wire.met_at,
    ...(wire.unit ? { unit: wire.unit } : {}),
    updatedAt: wire.updated_at,
  }),
  usageDay: (wire: WireUsageDay): Stamped<UsageDay> => ({
    day: wire.day,
    lockedAppMinutes: wire.locked_app_minutes,
    updatedAt: wire.updated_at,
  }),
  earnedUnlock: (wire: WireEarnedUnlock): Stamped<EarnedUnlock> => ({
    ruleId: wire.rule_id,
    day: wire.day,
    ruleName: wire.rule_name,
    metAt: wire.met_at,
    windowEnd: wire.window_end,
    updatedAt: wire.updated_at,
  }),
  historyDay: (wire: WireHistoryDay): Stamped<SealedHistoryDay> => ({
    day: wire.day,
    usageMinutes: wire.usage_minutes,
    activity: wire.activity,
    met: wire.met,
    scheduled: wire.scheduled,
    sealedAt: wire.sealed_at,
    updatedAt: wire.updated_at,
  }),
  profile: (wire: WireProfile): Stamped<Profile> => ({
    name: wire.name,
    referralSource: wire.referral_source,
    ageBand: wire.age_band,
    occupation: wire.occupation,
    improveFirst: wire.improve_first,
    mainReason: wire.main_reason,
    estimatedDailyMinutes: wire.estimated_daily_minutes,
    units: wire.units,
    updatedAt: wire.updated_at,
  }),
  snapshot: (wire: WirePull): SyncSnapshot => ({
    rules: wire.rules.filter((rule) => rule.deleted_at === null).map(fromWire.rule),
    tombstones: wire.rules
      .filter((rule): rule is WireRule & { deleted_at: string } => rule.deleted_at !== null)
      .map((rule): RuleTombstone => ({ id: rule.id, deletedAt: rule.deleted_at })),
    ruleDays: wire.rule_days.map(fromWire.ruleDay),
    usageDays: wire.usage_days.map(fromWire.usageDay),
    earnedUnlocks: wire.earned_unlocks.map(fromWire.earnedUnlock),
    history: wire.history.map(fromWire.historyDay),
    profile: wire.profile ? fromWire.profile(wire.profile) : null,
  }),
};

/** A pull body is untrusted input: absent collections read as empty rather than throwing at the boundary. */
export function readPull(body: unknown): WirePull {
  const value = (typeof body === 'object' && body !== null ? body : {}) as Partial<WirePull>;
  const list = <T>(rows: T[] | undefined): T[] => (Array.isArray(rows) ? rows : []);
  return {
    rules: list(value.rules),
    rule_days: list(value.rule_days),
    usage_days: list(value.usage_days),
    earned_unlocks: list(value.earned_unlocks),
    history: list(value.history),
    profile: value.profile ?? null,
  };
}
