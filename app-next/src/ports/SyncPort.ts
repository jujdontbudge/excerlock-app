import { DayKey, EarnedUnlock, Profile, Rule, RuleDay } from '../domain/types';
import { HistoryDay } from './models';

/** A row plus the instant it last changed; the server keeps the newest `updatedAt` per row (D5). */
export type Stamped<T> = T & { updatedAt: string };
/** A rule deleted on some device. Deletion travels explicitly so a stale device can never delete another's rule. */
export type RuleTombstone = { id: string; deletedAt: string };
/** A deletion this device still has to report; the rule travels whole because the server may never have seen it. */
export type DeletedRule = { rule: Rule; deletedAt: string };
/** A history row P2-T15 has sealed: immutable once written, so an `updatedAt` merge is safe. */
export type SealedHistoryDay = HistoryDay & { sealedAt: string };
/** Minutes spent in the locked apps on one local day (B15). One total; never an app identity. */
export type UsageDay = { day: DayKey; lockedAppMinutes: number };

/** Everything the server holds for the user, as `GET /v1/sync` returns it. */
export type SyncSnapshot = {
  rules: Rule[];
  tombstones: RuleTombstone[];
  ruleDays: Stamped<RuleDay>[];
  usageDays: Stamped<UsageDay>[];
  earnedUnlocks: Stamped<EarnedUnlock>[];
  history: Stamped<SealedHistoryDay>[];
  profile: Stamped<Profile> | null;
};

export const emptySnapshot = (): SyncSnapshot => ({
  rules: [],
  tombstones: [],
  ruleDays: [],
  usageDays: [],
  earnedUnlocks: [],
  history: [],
  profile: null,
});

/**
 * Backup and restore of rules, day facts and the profile (D5). Never a source of truth for enforcement:
 * the device decides every lock from its own stores, and the app selection never travels.
 */
export interface SyncPort {
  pushRules(rules: Rule[], deleted: DeletedRule[]): Promise<void>;
  pushRuleDays(rows: Stamped<RuleDay>[]): Promise<void>;
  pushUsageDays(rows: Stamped<UsageDay>[]): Promise<void>;
  pushEarnedUnlocks(rows: Stamped<EarnedUnlock>[]): Promise<void>;
  pushHistory(rows: Stamped<SealedHistoryDay>[]): Promise<void>;
  pushProfile(profile: Stamped<Profile>): Promise<void>;
  pull(): Promise<SyncSnapshot>;
}
