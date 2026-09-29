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

const STORAGE_KEY = 'excerlock-next.account-data.v1';

type AccountDataSnapshot = {
  conditions: ConditionsAccountData;
  history: HistoryArchive;
  profile: Profile;
};

type AccountDataEnvelope = {
  version: 1;
  activeUserId: string | null;
  accounts: Record<string, AccountDataSnapshot>;
  legacy: AccountDataSnapshot | null;
};

export type AccountDataStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

const emptyEnvelope = (): AccountDataEnvelope => ({ version: 1, activeUserId: null, accounts: {}, legacy: null });
const capture = (): AccountDataSnapshot => ({
  conditions: exportConditionsAccountData(),
  history: exportHistoryAccountData(),
  profile: exportProfileAccountData(),
});
const hasLegacyData = (snapshot: AccountDataSnapshot): boolean =>
  snapshot.conditions.rules.length > 0 ||
  !snapshot.conditions.lockedApps.isEmpty ||
  snapshot.conditions.days.length > 0 ||
  snapshot.history.startedDay !== null ||
  snapshot.history.days.length > 0 ||
  snapshot.profile.name.length > 0 ||
  snapshot.profile.referralSource.length > 0 ||
  snapshot.profile.ageBand.length > 0 ||
  snapshot.profile.occupation.length > 0 ||
  snapshot.profile.mainReason.length > 0;
const parseEnvelope = (raw: string | null): AccountDataEnvelope | null => {
  if (!raw) return null;
  const value = JSON.parse(raw) as Partial<AccountDataEnvelope>;
  if (value.version !== 1 || typeof value.accounts !== 'object' || value.accounts === null) {
    throw new Error('Invalid account data snapshot');
  }
  return {
    version: 1,
    activeUserId: typeof value.activeUserId === 'string' ? value.activeUserId : null,
    accounts: value.accounts as Record<string, AccountDataSnapshot>,
    legacy: value.legacy ?? null,
  };
};

export function createAccountDataCoordinator(storage: AccountDataStorage) {
  let envelope: AccountDataEnvelope | null = null;
  let queue: Promise<void> = Promise.resolve();
  const run = (operation: () => Promise<void>) => {
    const result = queue.then(operation);
    queue = result.catch(() => undefined);
    return result;
  };
  const persist = async () => {
    if (!envelope) throw new Error('Account data coordinator is not prepared');
    await storage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  };
  const resetActive = () => Promise.all([
    resetConditionsAccountData(),
    resetHistoryAccountData(),
    resetProfileAccountData(),
  ]).then(() => undefined);
  const restore = (snapshot: AccountDataSnapshot | undefined) => snapshot
    ? Promise.all([
        importConditionsAccountData(snapshot.conditions),
        importHistoryAccountData(snapshot.history),
        importProfileAccountData(snapshot.profile),
      ]).then(() => undefined)
    : resetActive();
  return {
    prepare: () => run(async () => {
      if (envelope) return;
      const stored = parseEnvelope(await storage.getItem(STORAGE_KEY));
      const active = capture();
      envelope = stored ?? emptyEnvelope();
      if (stored?.activeUserId) envelope.accounts[stored.activeUserId] = active;
      else if (!stored && hasLegacyData(active)) envelope.legacy = active;
      envelope.activeUserId = null;
      await persist();
      await resetActive();
    }),
    deactivate: () => run(async () => {
      if (!envelope) throw new Error('Account data coordinator is not prepared');
      if (envelope.activeUserId) envelope.accounts[envelope.activeUserId] = capture();
      envelope.activeUserId = null;
      await persist();
      await resetActive();
    }),
    activate: (userId: string) => run(async () => {
      if (!envelope) throw new Error('Account data coordinator is not prepared');
      if (envelope.activeUserId === userId) return;
      if (envelope.activeUserId) envelope.accounts[envelope.activeUserId] = capture();
      await restore(envelope.accounts[userId]);
      envelope.activeUserId = userId;
      await persist();
    }),
    snapshot: () => ({
      activeUserId: envelope?.activeUserId ?? null,
      legacyQuarantined: envelope?.legacy !== null && envelope?.legacy !== undefined,
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
