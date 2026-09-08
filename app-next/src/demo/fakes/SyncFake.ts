import { emptySnapshot, SyncPort, SyncSnapshot } from '../../ports/SyncPort';
import { FakeContext } from '../FakeContext';

/**
 * An in-memory server: whatever is pushed comes back from `pull`, so the restore flow can be exercised
 * locally. Nothing leaves the process and nothing survives a relaunch.
 */
export function SyncFake(ctx?: Pick<FakeContext, 'log'>): SyncPort {
  const server: SyncSnapshot = emptySnapshot();
  const upsert = <T>(rows: T[], incoming: T[], key: (row: T) => string) => {
    const byKey = new Map(rows.map((row) => [key(row), row]));
    for (const row of incoming) byKey.set(key(row), row);
    return [...byKey.values()];
  };
  return {
    pushRules: async (rules, deleted) => {
      const deletedIds = new Set(deleted.map((entry) => entry.rule.id));
      server.rules = upsert(server.rules, rules, (rule) => rule.id).filter((rule) => !deletedIds.has(rule.id));
      server.tombstones = upsert(
        server.tombstones,
        deleted.map((entry) => ({ id: entry.rule.id, deletedAt: entry.deletedAt })),
        (row) => row.id,
      );
      ctx?.log('sync_push', { kind: 'rules', count: rules.length, deleted: deleted.length });
    },
    pushRuleDays: async (rows) => {
      server.ruleDays = upsert(server.ruleDays, rows, (row) => `${row.ruleId}:${row.day}`);
      ctx?.log('sync_push', { kind: 'ruleDays', count: rows.length });
    },
    pushUsageDays: async (rows) => {
      server.usageDays = upsert(server.usageDays, rows, (row) => row.day);
      ctx?.log('sync_push', { kind: 'usageDays', count: rows.length });
    },
    pushEarnedUnlocks: async (rows) => {
      server.earnedUnlocks = upsert(server.earnedUnlocks, rows, (row) => `${row.ruleId}:${row.day}`);
      ctx?.log('sync_push', { kind: 'earnedUnlocks', count: rows.length });
    },
    pushProfile: async (profile) => {
      server.profile = profile;
      ctx?.log('sync_push', { kind: 'profile', count: 1 });
    },
    pull: async () => {
      ctx?.log('sync_pull', { rules: server.rules.length });
      return JSON.parse(JSON.stringify(server));
    },
  };
}
