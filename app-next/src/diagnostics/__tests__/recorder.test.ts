import { startDiagnostics } from '../recorder';
import { DiagnosticsLog } from '../DiagnosticsLog';
import { createRuntime } from '../../runtime/createRuntime';
import { Runtime } from '../../runtime/Runtime';
import { permissionsStore } from '../../state/permissionsStore';
import { sessionStore } from '../../state/sessionStore';
import { syncLog } from '../../adapters/sync/syncLog';

function memoryStorage() {
  const items = new Map<string, string>();
  return {
    getItem: async (key: string) => items.get(key) ?? null,
    setItem: async (key: string, value: string) => void items.set(key, value),
    removeItem: async (key: string) => void items.delete(key),
  };
}

function appStateSource() {
  let listener: ((state: string) => void) | undefined;
  return {
    source: {
      addEventListener: (_event: 'change', callback: (state: string) => void) => {
        listener = callback;
        return { remove: jest.fn() };
      },
    },
    change: (state: string) => listener?.(state),
  };
}

async function harness(over: Partial<Runtime> = {}) {
  const base = createRuntime();
  await base.dev.load('fresh-install');
  const runtime = { ...base, ...over } as Runtime;
  const log = new DiagnosticsLog({ storage: memoryStorage(), now: () => 1_000 });
  const appState = appStateSource();
  const diagnostics = startDiagnostics(runtime, {
    log,
    appState: appState.source,
    build: { build: 'abc123', iosVersion: '18.2', device: 'iPhone17,1' },
    drainExtensions: jest.fn(),
  });
  const events = (name: string) => log.entries().filter((entry) => entry.event === name);
  return { runtime, log, appState, events, ...diagnostics };
}

afterEach(() => {
  syncLog.getState().clear();
});

test('the first entry of a session says which build and which runtime this is', async () => {
  const { events, stop } = await harness({ kind: 'real' });
  expect(events('app.launch')[0].data).toEqual({
    build: 'abc123',
    iosVersion: '18.2',
    device: 'iPhone17,1',
    runtime: 'real',
  });
  stop();
});

test('every app-state transition is recorded, because two launches prove a kill', async () => {
  const { appState, events, stop } = await harness();
  appState.change('background');
  appState.change('active');
  expect(events('app.state').map((entry) => entry.data.state)).toEqual(['background', 'active']);
  stop();
});

test('the extension buffer is drained on foreground, where the app can read it', async () => {
  const base = createRuntime();
  await base.dev.load('fresh-install');
  const drainExtensions = jest.fn();
  const appState = appStateSource();
  const { stop } = startDiagnostics(base, {
    log: new DiagnosticsLog({ storage: memoryStorage(), now: () => 1_000 }),
    appState: appState.source,
    drainExtensions,
  });
  appState.change('background');
  expect(drainExtensions).not.toHaveBeenCalled();
  appState.change('active');
  expect(drainExtensions).toHaveBeenCalledTimes(1);
  stop();
});

test('a permission is recorded when it changes, not on every read', async () => {
  const { events, stop } = await harness();
  permissionsStore.getState().patch({ motion: 'granted' });
  permissionsStore.getState().patch({ motion: 'granted' });
  permissionsStore.getState().patch({ motion: 'denied' });
  expect(events('permission.status').map((entry) => entry.data)).toEqual([
    { name: 'motion', status: 'granted' },
    { name: 'motion', status: 'denied' },
  ]);
  stop();
});

test('the session is recorded by id and never by token', async () => {
  const { events, stop } = await harness();
  sessionStore.getState().patch({ session: { kind: 'signedIn', userId: 'u-9', provider: 'apple', email: 'a@b.test' } });
  const entry = events('auth.session').at(-1);
  expect(entry?.data).toEqual({ kind: 'signedIn', provider: 'apple', userId: 'u-9' });
  expect(JSON.stringify(entry)).not.toContain('a@b.test');
  stop();
});

test('the host records what only it knows, through the recorder it is handed', async () => {
  const { record, events, stop } = await harness();
  // `enforcement.plan` and `enforcement.apply` carry the decision and the plan hash, which live in
  // `runtime/EnforcementHost` and never reach a store, so the host is handed `record` rather than
  // the recorder reaching into it.
  record('enforcement.apply', { decision: 'locked', applied: false, shields: 'up', planHash: 'p1' });
  expect(events('enforcement.apply').at(-1)?.data).toMatchObject({ decision: 'locked', applied: false });
  stop();
});

test('a stopped recorder ignores a host that is still holding its record function', async () => {
  const { record, events, stop } = await harness();
  stop();
  record('enforcement.apply', { decision: 'locked', applied: true, shields: 'up', planHash: 'p1' });
  expect(events('enforcement.apply')).toEqual([]);
});

test('a restore is recorded with its row counts, which is what the runbook checks', async () => {
  const { events, stop } = await harness();
  syncLog.getState().restored({
    at: '2026-09-08T10:00:00.000Z',
    localWasEmpty: true,
    summary: { rules: 3, removedRules: 0, ruleDays: 4, earnedUnlocks: 1, history: 6, usageDays: 2, profile: true },
  });
  expect(events('sync.pull').at(-1)?.data).toEqual({ rules: 3, ruleDays: 4, history: 6, earnedUnlocks: 1 });
  stop();
});

test('analytics are recorded by name only, never with their properties', async () => {
  const { runtime, events, stop } = await harness();
  runtime.analytics.track('unlock_ceremony_done', { kind: 'treadmill', userId: 'u-9' });
  expect(events('analytics.event').at(-1)?.data).toEqual({ name: 'unlock_ceremony_done' });
  stop();
});

test('nothing is recorded once the recorder is stopped', async () => {
  const { appState, events, stop } = await harness();
  stop();
  appState.change('active');
  expect(events('app.state')).toEqual([]);
});
