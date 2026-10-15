import {
  exportConditionsAccountData,
  importConditionsAccountData,
  resetConditionsAccountData,
  type ConditionsAccountData,
} from '../conditions/AccountData';
import {
  exportHistoryAccountData,
  importHistoryAccountData,
  resetHistoryAccountData,
} from '../progress/AccountData';
import type { HistoryArchive } from '../progress/sealDay';
import {
  exportProfileAccountData,
  importProfileAccountData,
  resetProfileAccountData,
} from '../preferences/ProfileAccountData';
import type { Profile } from '../model/types';
import {
  exportSettingsAccountData,
  importSettingsAccountData,
  resetSettingsAccountData,
  type SettingsAccountData,
} from '../preferences/SettingsAccountData';
import type { ActivityAccountData } from '../activity/ActivityAccountData';

import { exportBankAccountData, importBankAccountData, resetBankAccountData } from '../bank/AccountData';
import type { BankData } from '../bank/bankStore';
import { assertBankExclusive } from '../conditions/BankExclusivity';

const STORAGE_KEY = 'excerlock-next.account-data.v1';

type AccountDataSnapshot = {
  conditions: ConditionsAccountData;
  bank?: BankData;
  history: HistoryArchive;
  profile: Profile;
  settings?: SettingsAccountData;
  activity?: ActivityAccountData;
};

type AccountDataEnvelope = {
  version: 1;
  activeUserId: string | null;
  lastUserId?: string | null;
  accounts: Record<string, AccountDataSnapshot>;
  legacy: AccountDataSnapshot | null;
};

export type AccountDataStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

export type AccountActivityData = {
  capture(): Promise<ActivityAccountData>;
  restore(snapshot: ActivityAccountData | undefined): Promise<void>;
  reset(): Promise<void>;
  hasData(snapshot: ActivityAccountData): boolean;
};

const emptyEnvelope = (): AccountDataEnvelope => ({
  version: 1,
  activeUserId: null,
  lastUserId: null,
  accounts: {},
  legacy: null,
});
const capture = async (activity?: AccountActivityData): Promise<AccountDataSnapshot> => {
  const conditions = exportConditionsAccountData();
  assertBankExclusive(conditions.rules);
  return {
    conditions,
    bank: exportBankAccountData(),
    history: exportHistoryAccountData(),
    profile: exportProfileAccountData(),
    settings: exportSettingsAccountData(),
    activity: await activity?.capture(),
  };
};
const hasLegacyData = (snapshot: AccountDataSnapshot, activity?: AccountActivityData): boolean =>
  snapshot.conditions.rules.length > 0 ||
  !snapshot.conditions.lockedApps.isEmpty ||
  snapshot.conditions.days.length > 0 ||
  snapshot.history.startedDay !== null ||
  snapshot.history.days.length > 0 ||
  (snapshot.settings?.gymPlaces.length ?? 0) > 0 ||
  snapshot.settings?.gymAutoDetect === true ||
  (snapshot.settings?.stopGrace ?? 30) !== 30 ||
  snapshot.profile.name.length > 0 ||
  snapshot.profile.referralSource.length > 0 ||
  snapshot.profile.ageBand.length > 0 ||
  snapshot.profile.occupation.length > 0 ||
  snapshot.profile.mainReason.length > 0 ||
  Boolean(snapshot.activity && activity?.hasData(snapshot.activity));
const parseEnvelope = (raw: string | null): AccountDataEnvelope | null => {
  if (!raw) return null;
  const value = JSON.parse(raw) as Partial<AccountDataEnvelope>;
  if (value.version !== 1 || typeof value.accounts !== 'object' || value.accounts === null) {
    throw new Error('Invalid account data snapshot');
  }
  return {
    version: 1,
    activeUserId: typeof value.activeUserId === 'string' ? value.activeUserId : null,
    lastUserId: typeof value.lastUserId === 'string' ? value.lastUserId : null,
    accounts: value.accounts as Record<string, AccountDataSnapshot>,
    legacy: value.legacy ?? null,
  };
};

export function createAccountDataCoordinator(storage: AccountDataStorage, activity?: AccountActivityData) {
  let envelope: AccountDataEnvelope | null = null;
  let lastUserId: string | null = null;
  let queue: Promise<void> = Promise.resolve();
  const run = <T>(operation: () => Promise<T>) => {
    const result = queue.then(operation);
    queue = result.then(() => undefined, () => undefined);
    return result;
  };
  const persist = async () => {
    if (!envelope) throw new Error('Account data coordinator is not prepared');
    await storage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  };
  const resetActive = () => Promise.all([
    resetConditionsAccountData(),
    resetHistoryAccountData(),
    resetBankAccountData(),
    resetProfileAccountData(),
    resetSettingsAccountData(),
    activity?.reset(),
  ]).then(() => undefined);
  const restore = (snapshot: AccountDataSnapshot | undefined) => {
    if (!snapshot) return resetActive();
    assertBankExclusive(snapshot.conditions.rules);
    return Promise.all([
      importConditionsAccountData(snapshot.conditions),
      importHistoryAccountData(snapshot.history),
      importBankAccountData(snapshot.bank),
      importProfileAccountData(snapshot.profile),
      snapshot.settings ? importSettingsAccountData(snapshot.settings) : resetSettingsAccountData(),
      activity?.restore(snapshot.activity),
    ]).then(() => undefined);
  };
  return {
    prepare: () => run(async () => {
      if (envelope) return;
      const stored = parseEnvelope(await storage.getItem(STORAGE_KEY));
      const active = await capture(activity);
      envelope = stored ?? emptyEnvelope();
      if (stored?.activeUserId) envelope.accounts[stored.activeUserId] = active;
      else if (!stored && hasLegacyData(active, activity)) envelope.legacy = active;
      lastUserId = stored?.activeUserId ?? stored?.lastUserId ?? null;
      envelope.lastUserId = lastUserId;
      envelope.activeUserId = null;
      await persist();
      await resetActive();
    }),
    deactivate: () => run(async () => {
      if (!envelope) throw new Error('Account data coordinator is not prepared');
      if (envelope.activeUserId) {
        lastUserId = envelope.activeUserId;
        envelope.lastUserId = lastUserId;
        envelope.accounts[envelope.activeUserId] = await capture(activity);
      }
      envelope.activeUserId = null;
      await persist();
      await resetActive();
    }),
    eraseActive: () => run(async () => {
      if (!envelope) throw new Error('Account data coordinator is not prepared');
      if (envelope.activeUserId) delete envelope.accounts[envelope.activeUserId];
      lastUserId = null;
      envelope.lastUserId = null;
      envelope.activeUserId = null;
      await persist();
      await resetActive();
    }),
    activate: (userId: string) => run(async () => {
      if (!envelope) throw new Error('Account data coordinator is not prepared');
      if (envelope.activeUserId === userId) return { changedAccount: false };
      if (envelope.activeUserId) {
        lastUserId = envelope.activeUserId;
        envelope.lastUserId = lastUserId;
        envelope.accounts[envelope.activeUserId] = await capture(activity);
      }
      const changedAccount = lastUserId !== userId && (lastUserId !== null || envelope.legacy !== null);
      await restore(envelope.accounts[userId]);
      envelope.activeUserId = userId;
      lastUserId = userId;
      envelope.lastUserId = userId;
      await persist();
      return { changedAccount };
    }),
    snapshot: () => ({
      activeUserId: envelope?.activeUserId ?? null,
      legacyQuarantined: envelope?.legacy !== null && envelope?.legacy !== undefined,
    }),
    save: () => run(async () => {
      if (!envelope) throw new Error('Account data coordinator is not prepared');
      if (envelope.activeUserId) envelope.accounts[envelope.activeUserId] = await capture(activity);
      await persist();
    }),
    flush: () => queue,
  };
}

export function createMemoryAccountDataStorage(): AccountDataStorage {
  const values = new Map<string, string>();
  return {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => {
      values.set(key, value);
    },
  };
}
