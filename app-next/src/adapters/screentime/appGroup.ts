import { ShieldContent } from '../../domain/shieldContent';
import { DayKey } from '../../domain/types';
import { DeviceActivityApi } from '../../engine/screentime/native/deviceActivityTypes';

export const FACTS_SCHEMA_VERSION = 1;
export const USAGE_SCHEMA_VERSION = 1;
/** Enough history that a phone offline for a fortnight still syncs its usage days. */
export const USAGE_HISTORY_DAYS = 14;

export const APP_GROUP_KEYS = Object.freeze({
  /** The whole enforcement snapshot, for diagnostics and for the app's own next launch. */
  facts: 'excerlock.enforcement.facts.v1',
  usage: 'excerlock.usage.days.v1',
  /**
   * One shield per monitor (B36), promoted by the monitor extension when its window starts.
   * The three keys for the shield showing right now belong to the engine's `ShieldContentPublisher`.
   */
  lockWindowContexts: 'excerlock.shield.lock-window-contexts.v1',
});

/**
 * What the app knows and the OS side may need. Written on every apply, so a crash, a lapse or a
 * fortnight offline still leaves the last true statement behind.
 */
export type EnforcementFacts = {
  schemaVersion: number;
  shieldsDesired: 'up' | 'down';
  /** When an earned or provisional unlock relocks; `null` when nothing is holding the apps open. */
  unlockUntil: string | null;
  leaseUntil: string | null;
  /** The walking session the lease belongs to, rewritten on every renewal. */
  sessionId: string | null;
  watermark: string;
  entitled: boolean;
  planHash: string;
  shieldContentByMonitor: Record<string, ShieldContent>;
};

export type UsageRecord = {
  schemaVersion: number;
  days: Record<DayKey, number>;
};

export function writeFacts(api: DeviceActivityApi, facts: Omit<EnforcementFacts, 'schemaVersion'>): EnforcementFacts {
  const record: EnforcementFacts = { schemaVersion: FACTS_SCHEMA_VERSION, ...facts };
  api.setSharedValue(APP_GROUP_KEYS.facts, record);
  return record;
}

/** A record written by an older schema is not read: a wrong fact is worse than no fact. */
export function readFacts(api: DeviceActivityApi): EnforcementFacts | null {
  const stored = api.getSharedValue<EnforcementFacts>(APP_GROUP_KEYS.facts);
  return stored?.schemaVersion === FACTS_SCHEMA_VERSION ? stored : null;
}

export function readUsage(api: DeviceActivityApi): UsageRecord {
  const stored = api.getSharedValue<UsageRecord>(APP_GROUP_KEYS.usage);
  return stored?.schemaVersion === USAGE_SCHEMA_VERSION ? stored : { schemaVersion: USAGE_SCHEMA_VERSION, days: {} };
}

/** Keeps the newest `USAGE_HISTORY_DAYS` days, so the record cannot grow without bound. */
export function writeUsageDay(api: DeviceActivityApi, day: DayKey, minutes: number): UsageRecord {
  const days = { ...readUsage(api).days, [day]: minutes };
  const kept = Object.keys(days)
    .sort()
    .slice(-USAGE_HISTORY_DAYS);
  const record: UsageRecord = {
    schemaVersion: USAGE_SCHEMA_VERSION,
    days: Object.fromEntries(kept.map((key) => [key, days[key]])),
  };
  api.setSharedValue(APP_GROUP_KEYS.usage, record);
  return record;
}
