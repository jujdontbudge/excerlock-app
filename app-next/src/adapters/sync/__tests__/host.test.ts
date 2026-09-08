import AsyncStorage from '@react-native-async-storage/async-storage';
import { rule } from '../../../domain/__tests__/fixtures';
import { Rule } from '../../../domain/types';
import { emptySnapshot, SyncPort, SyncSnapshot } from '../../../ports/SyncPort';
import { createRuntime, Runtime } from '../../../runtime/createRuntime';
import { profileStore } from '../../../state/profileStore';
import { ruleDaysStore } from '../../../state/ruleDaysStore';
import { rulesStore } from '../../../state/rulesStore';
import { sessionStore } from '../../../state/sessionStore';
import { SyncError } from '../SyncClient';
import { AppStateSource, startSync, SyncHandle, SyncHostOptions } from '../SyncHost';
import { syncLog } from '../syncLog';
import { syncStore } from '../syncStore';

const settle = async () => {
  for (let round = 0; round < 6; round += 1) await new Promise((resolve) => setTimeout(resolve, 0));
};

/** The first pull (the anonymous identity at boot) finds nothing; later pulls return the given snapshot. */
function mockSync(snapshot: SyncSnapshot = emptySnapshot()): jest.Mocked<SyncPort> {
  return {
    pushRules: jest.fn().mockResolvedValue(undefined),
    pushRuleDays: jest.fn().mockResolvedValue(undefined),
    pushUsageDays: jest.fn().mockResolvedValue(undefined),
    pushEarnedUnlocks: jest.fn().mockResolvedValue(undefined),
    pushProfile: jest.fn().mockResolvedValue(undefined),
    pull: jest.fn().mockResolvedValueOnce(emptySnapshot()).mockResolvedValue(snapshot),
  };
}

function appStateStub(): AppStateSource & { emit(state: string): void } {
  const listeners = new Set<(state: string) => void>();
  return {
    addEventListener: (_event, callback) => {
      listeners.add(callback);
      return { remove: () => listeners.delete(callback) };
    },
    emit: (state) => listeners.forEach((callback) => callback(state)),
  };
}

let runtime: Runtime, host: SyncHandle;

async function boot(snapshot?: SyncSnapshot, options: SyncHostOptions = {}) {
  runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  const sync = mockSync(snapshot);
  runtime.sync = sync;
  host = startSync(runtime, options);
  await host.ready;
  await settle();
  return sync;
}

const advance = async (ms: number) => {
  runtime.dev.advance(ms);
  await settle();
};
const signIn = (userId: string) =>
  sessionStore.getState().patch({ session: { kind: 'signedIn', userId, provider: 'apple', email: null } });

beforeEach(async () => {
  await AsyncStorage.clear();
  syncStore.getState().reset();
  syncLog.getState().clear();
});
afterEach(() => {
  host.stop();
  runtime.dispose();
});

test('first launch restores once for the anonymous identity, then pushes the full device state', async () => {
  const sync = await boot();
  expect(sync.pull).toHaveBeenCalledTimes(1);
  expect(sync.pushRules).toHaveBeenCalledTimes(1);
  expect(sync.pushProfile).toHaveBeenCalledTimes(1);
  expect(syncStore.getState().data).toMatchObject({ identity: 'anonymous:fake-anonymous-user', restored: true, rulesDirty: false });
  expect(syncLog.getState().lastPushAt).not.toBeNull();
});

test('rule edits pull the server set first, then push once, five seconds after the last edit', async () => {
  const sync = await boot();
  sync.pushRules.mockClear();
  sync.pull.mockClear();
  rulesStore.getState().patch({ rules: [rule] });
  await advance(2_000);
  const edited: Rule = { ...rule, enabled: false, updatedAt: runtime.clock.now() };
  rulesStore.getState().patch({ rules: [edited] });
  await advance(2_000);
  expect(sync.pushRules).not.toHaveBeenCalled();
  await advance(3_100);
  expect(sync.pull).toHaveBeenCalledTimes(1);
  expect(sync.pull.mock.invocationCallOrder[0]).toBeLessThan(sync.pushRules.mock.invocationCallOrder[0]);
  expect(sync.pushRules).toHaveBeenCalledTimes(1);
  expect(sync.pushRules).toHaveBeenCalledWith([edited], []);
  expect(syncStore.getState().data.rulesDirty).toBe(false);
});

test('a rules push merges what another device wrote since the last pull instead of tombstoning it', async () => {
  const theirs: Rule = { ...rule, id: 'their-walk' };
  const sync = await boot({ ...emptySnapshot(), rules: [theirs] });
  sync.pushRules.mockClear();
  rulesStore.getState().patch({ rules: [rule] });
  await advance(5_100);
  expect(sync.pushRules).toHaveBeenCalledWith(expect.arrayContaining([rule, theirs]), []);
  expect(rulesStore.getState().data.rules).toHaveLength(2);
});

test('a deleted rule travels as a tombstone and is remembered', async () => {
  const sync = await boot();
  rulesStore.getState().patch({ rules: [rule] });
  await advance(5_100);
  rulesStore.getState().patch({ rules: [] });
  await advance(5_100);
  expect(sync.pushRules).toHaveBeenLastCalledWith([], [{ rule, deletedAt: expect.any(String) }]);
  expect(syncStore.getState().data.deleted).toEqual([]);
  expect(syncStore.getState().data.tombstones).toEqual([{ id: rule.id, deletedAt: expect.any(String) }]);
});

test('offline changes queue in the outbox and flush on reconnect', async () => {
  const sync = await boot();
  sync.pushRules.mockClear();
  runtime.dev.setOnline(false);
  rulesStore.getState().patch({ rules: [rule] });
  await advance(6_000);
  expect(sync.pushRules).not.toHaveBeenCalled();
  expect(syncStore.getState().data.rulesDirty).toBe(true);
  expect(syncLog.getState().entries.at(-1)).toMatchObject({ level: 'info', message: 'offline; changes queued' });
  runtime.dev.setOnline(true);
  await advance(30_000);
  expect(sync.pushRules).toHaveBeenCalledTimes(1);
  expect(syncStore.getState().data.rulesDirty).toBe(false);
});

test('day facts push after the first change, then wait for the cadence or the background transition', async () => {
  const appState = appStateStub();
  const sync = await boot(undefined, { appState });
  const today = runtime.clock.now().slice(0, 10);
  const row = { ruleId: rule.id, day: today, progress: 100, met: false, metAt: null };
  ruleDaysStore.getState().patch({ days: [row] });
  await advance(5_100);
  expect(sync.pushRuleDays).toHaveBeenCalledTimes(1);
  expect(sync.pushRuleDays).toHaveBeenCalledWith([{ ...row, updatedAt: expect.any(String) }]);
  ruleDaysStore.getState().patch({ days: [{ ...row, progress: 200 }] });
  await advance(60_000);
  expect(sync.pushRuleDays).toHaveBeenCalledTimes(1);
  appState.emit('background');
  await settle();
  expect(sync.pushRuleDays).toHaveBeenCalledTimes(2);
  expect(sync.pushRuleDays).toHaveBeenLastCalledWith([{ ...row, progress: 200, updatedAt: expect.any(String) }]);
  ruleDaysStore.getState().patch({ days: [{ ...row, progress: 300 }] });
  await advance(14 * 60_000);
  expect(sync.pushRuleDays).toHaveBeenCalledTimes(2);
  await advance(2 * 60_000);
  expect(sync.pushRuleDays).toHaveBeenCalledTimes(3);
  expect(syncStore.getState().data.ruleDays).toEqual({});
});

test('a rejected session pauses sync, asks for re-auth once, and resumes when the session changes', async () => {
  const onAuthRequired = jest.fn();
  const sync = await boot(undefined, { onAuthRequired });
  sync.pushRules.mockClear();
  sync.pushRules.mockRejectedValueOnce(new SyncError('auth', 'Session rejected', 401));
  rulesStore.getState().patch({ rules: [rule] });
  await advance(5_100);
  expect(syncLog.getState().authRequired).toBe(true);
  expect(onAuthRequired).toHaveBeenCalledTimes(1);
  rulesStore.getState().patch({ rules: [{ ...rule, enabled: false }] });
  await advance(60_000);
  expect(sync.pushRules).toHaveBeenCalledTimes(1);
  expect(onAuthRequired).toHaveBeenCalledTimes(1);
  signIn('user-2');
  await settle();
  expect(syncLog.getState().authRequired).toBe(false);
  expect(sync.pull).toHaveBeenCalledTimes(3);
  expect(sync.pushRules).toHaveBeenCalledTimes(2);
});

test('a server failure backs off and retries without losing the change', async () => {
  const sync = await boot();
  sync.pushRules.mockClear();
  sync.pushRules.mockRejectedValueOnce(new SyncError('server', 'Server returned 503', 503));
  rulesStore.getState().patch({ rules: [rule] });
  await advance(5_100);
  expect(sync.pushRules).toHaveBeenCalledTimes(1);
  expect(syncStore.getState().data.rulesDirty).toBe(true);
  expect(syncLog.getState().entries.at(-1)).toMatchObject({ level: 'warn', message: expect.stringContaining('retry 1 in 30s') });
  await advance(30_100);
  expect(sync.pushRules).toHaveBeenCalledTimes(2);
  expect(syncStore.getState().data.rulesDirty).toBe(false);
});

test('a client rejection drops that batch, logs it and lets the next step run', async () => {
  const sync = await boot();
  sync.pushProfile.mockRejectedValueOnce(new SyncError('client', 'Request rejected with 400', 400));
  sync.pushRuleDays.mockClear();
  profileStore.getState().patch({ name: 'Alex' });
  const today = runtime.clock.now().slice(0, 10);
  ruleDaysStore.getState().patch({ days: [{ ruleId: rule.id, day: today, progress: 1, met: false, metAt: null }] });
  await advance(5_100);
  expect(syncStore.getState().data.profileDirty).toBe(false);
  expect(syncLog.getState().entries.some((entry) => entry.level === 'error' && entry.message.startsWith('profile'))).toBe(true);
  expect(sync.pushRuleDays).toHaveBeenCalledTimes(1);
});

test('sign-in on an empty device restores the server rules, records a welcome-back summary and pushes them back', async () => {
  const remote: Rule = { ...rule, id: 'remote-walk' };
  const sync = await boot({
    ...emptySnapshot(),
    rules: [remote],
    ruleDays: [{ ruleId: remote.id, day: '2026-09-05', progress: 6000, met: true, metAt: '2026-09-05T12:00:00Z', updatedAt: '2026-09-05T12:00:00Z' }],
  });
  sync.pushRules.mockClear();
  signIn('user-2');
  await settle();
  expect(rulesStore.getState().data.rules).toEqual([remote]);
  expect(ruleDaysStore.getState().data.days).toEqual([{ ruleId: remote.id, day: '2026-09-05', progress: 6000, met: true, metAt: '2026-09-05T12:00:00Z' }]);
  expect(rulesStore.getState().data.lockedApps).toEqual({ handle: null, appCount: 0, categoryCount: 0 });
  expect(syncLog.getState().lastRestore).toMatchObject({ localWasEmpty: true, summary: { rules: 1, ruleDays: 1 } });
  expect(sync.pushRules).toHaveBeenCalledWith([remote], []);
  expect(syncStore.getState().data.identity).toBe('signedIn:user-2');
});

test('restore never overwrites a newer local rule or the device-authoritative day row', async () => {
  const older: Rule = { ...rule, enabled: false, updatedAt: '2026-01-01T00:00:00Z' };
  const sync = await boot({
    ...emptySnapshot(),
    rules: [older],
    ruleDays: [{ ruleId: rule.id, day: '2026-09-07', progress: 9999, met: true, metAt: '2026-09-07T01:00:00Z', updatedAt: '2026-09-07T01:00:00Z' }],
  });
  const today = runtime.clock.now().slice(0, 10);
  const mine = { ruleId: rule.id, day: today, progress: 10, met: false, metAt: null };
  rulesStore.getState().patch({ rules: [rule] });
  ruleDaysStore.getState().patch({ days: [mine] });
  await advance(5_100);
  signIn('user-2');
  await settle();
  expect(rulesStore.getState().data.rules).toEqual([rule]);
  expect(ruleDaysStore.getState().data.days).toEqual([mine]);
  expect(sync.pull).toHaveBeenCalledTimes(3);
});

test('a restored gym rule with no saved gym on this device is paused, not enforced blind', async () => {
  const gym: Rule = { ...rule, id: 'gym', activity: 'gym', mode: { kind: 'event', activity: 'gym', trigger: 'arrival' } };
  await boot({ ...emptySnapshot(), rules: [gym] });
  signIn('user-2');
  await settle();
  expect(rulesStore.getState().data.rules[0]).toMatchObject({ id: 'gym', enabled: false, pausedReason: 'noGym' });
});

test('stop releases every subscription and timer', async () => {
  const sync = await boot();
  host.stop();
  sync.pushRules.mockClear();
  rulesStore.getState().patch({ rules: [rule] });
  await advance(10_000);
  expect(sync.pushRules).not.toHaveBeenCalled();
});
