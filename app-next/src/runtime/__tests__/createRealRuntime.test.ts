const mockHydrate = jest.fn<Promise<void>, []>();
const mockCreateDetection = jest.fn();
const mockCreateClient = jest.fn();
const mockNativeGait = jest.fn();
const mockCreateClock = jest.fn();
const mockCreateWalking = jest.fn();
const mockCreateGym = jest.fn();
const mockCreateScreenTime = jest.fn();
const mockRegisterHeadless = jest.fn(() => jest.fn());
jest.mock('expo-constants', () => ({ expoConfig: { extra: {}, version: '1.0.0', ios: { buildNumber: '1' } } }));
jest.mock('../hydrateProductionStores', () => ({ hydrateProductionStores: () => mockHydrate() }));
jest.mock('../createClientServices', () => ({ createClientServices: (...args: unknown[]) => mockCreateClient(...args) }));
jest.mock('../detection/createNativeDetection', () => ({ createNativeDetection: (...args: unknown[]) => mockCreateDetection(...args) }));
jest.mock('../detection/NativeWalkingPort', () => ({ NativeWalkingPort: function (...args: unknown[]) { return mockCreateWalking(...args); } }));
jest.mock('../detection/NativeGymPort', () => ({ createNativeGymPort: (...args: unknown[]) => mockCreateGym(...args) }));
jest.mock('../NativeClockPort', () => ({ createNativeClockPort: () => mockCreateClock() }));
jest.mock('../NativeSupportPort', () => ({ createNativeSupportPort: () => ({ send: jest.fn() }) }));
const mockStoreReviewRequest = jest.fn(async () => {});
jest.mock('expo-store-review', () => ({ isAvailableAsync: async () => false, requestReview: () => mockStoreReviewRequest() }));
jest.mock('../NativeGait', () => ({ nativeGait: () => mockNativeGait() }));
jest.mock('../../screentime/native/createNativeScreenTimePort', () => ({ createNativeScreenTimePort: (...args: unknown[]) => mockCreateScreenTime(...args) }));
jest.mock('../../../modules/excerlock-enforcement', () => ({ getExcerlockEnforcementModule: () => ({ getPolicyRevision: () => 1 }) }));
jest.mock('../enforcement/native/NativeEnforcementTransport', () => ({ NativeEnforcementTransport: function () { return {}; } }));
const mockSourceRead = jest.fn();
jest.mock('../enforcement/RuntimeEnforcementSource', () => ({ RuntimeEnforcementSource: function () { return { read: mockSourceRead }; } }));
const mockHostDispose = jest.fn();
const mockHostReconcile = jest.fn(async () => 'applied');
jest.mock('../enforcement/EnforcementHost', () => ({ EnforcementHost: function () { return { reconcile: mockHostReconcile, dispose: mockHostDispose }; } }));
jest.mock('../detection/headlessRegistry', () => ({ registerHeadlessDetectionHandler: () => mockRegisterHeadless() }));
jest.mock('../../domain/projectStepHistory', () => ({ projectStepHistory: (_rules: unknown, rows: unknown) => rows }));
jest.mock('../../domain/projectGymHistory', () => ({ ...jest.requireActual('../../domain/projectGymHistory'), projectGymHistory: (_rules: unknown, rows: unknown) => rows }));

import { AppState } from 'react-native';
import { ruleDaysStore } from '../../state/ruleDaysStore';
import { rulesStore } from '../../state/rulesStore';
import { historyStore } from '../../state/historyStore';
import { createRealRuntime } from '../createRealRuntime';
import { RuntimeCleanupError } from '../RuntimeSingleton';

const store = (data: object) => ({ retryPersistence: jest.fn(async () => {}), persistBarrier: jest.fn(async () => {}), getState: () => ({ data, patch: jest.fn() }), subscribe: jest.fn(() => jest.fn()) });
jest.mock('../../state/detectionStore', () => ({ detectionStore: store({ generation: 0 }) }));
jest.mock('../../state/rulesStore', () => ({ rulesStore: store({ rules: [], lockedApps: { handle: null, isEmpty: true } }) }));
jest.mock('../../state/ruleDaysStore', () => ({ ruleDaysStore: store({ days: [], gymPresence: null }) }));
jest.mock('../../state/settingsStore', () => ({ settingsStore: store({ stopGrace: 30, gymAutoDetect: false, gymPlaces: [] }) }));
jest.mock('../../state/permissionsStore', () => ({ permissionsStore: store({ screenTime: 'notDetermined' }) }));
jest.mock('../../state/entitlementStore', () => ({ entitlementStore: store({ status: 'unknown' }) }));

function graph(options?: { gait?: object | null; boot?: () => Promise<void>; authorization?: string }) {
  const gait = options?.gait === undefined ? { stop: jest.fn(async () => {}), start: jest.fn() } : options.gait;
  const clock = { readNow: () => '2026-09-10T12:00:00Z', timezone: () => 'UTC', now: () => '2026-09-10T12:00:00Z', subscribe: jest.fn(() => jest.fn()), dispose: jest.fn() };
  const detection = {
    service: {
      stop: jest.fn(async () => {}), tick: jest.fn(async () => {}), flush: jest.fn(async () => {}),
      measureStepRanges: jest.fn(async () => ({})),
      pruneGymHistory: jest.fn(async () => {}),
      observeCommitted: jest.fn(() => jest.fn()),
    }, motion: {}, placement: {},
    steps: { authorizationStatus: () => options?.authorization ?? 'denied' },
    awake: { reconcile: jest.fn(async () => ({ requested: false, running: false, error: null })) },
    location: { stopMonitoringRegions: jest.fn(async () => {}), refreshAuthorization: jest.fn(async () => 'notDetermined') },
    start: jest.fn(async () => {}), stop: jest.fn(async () => {}), registerGyms: jest.fn(async () => {}),
    reconcileWake: jest.fn(async () => {}), walkingDurationLedger: { pruneBeforeDay: jest.fn(async () => {}), read: jest.fn(async () => ({ generation: 0, millisecondsByDay: {}, pending: [], segments: [] })), reset: jest.fn(async () => {}), acknowledge: jest.fn(async () => {}) },
    historyLedger: { pruneBeforeDay: jest.fn(async () => {}), read: jest.fn(async () => ({ stepsByDay: {}, instanceMeasurements: {} })) },
    gymLog: { pruneBefore: jest.fn(async () => {}) },
    snapshot: () => ({ gym: { intervals: [], regions: {} } }),
  };
  const identity = { kind: 'anonymous', generation: 0 };
  const client = {
    boot: jest.fn(options?.boot ?? (async () => {})), dispose: jest.fn(),
    auth: { identity: () => identity, subscribeIdentity: jest.fn(() => jest.fn()) },
    subscription: { entitlement: () => ({ status: 'unknown' }) }, analytics: { track: jest.fn() }, notifications: {}, dataExport: {},
    reviewPreset: { isEnabled: jest.fn(async () => false), expose: jest.fn() },
  };
  const walking = { snapshot: () => ({ phase: 'inactive' }), stop: jest.fn() };
  const gym = { authorizationStatus: () => 'denied', requestLocation: jest.fn(async () => 'denied') };
  const screenTime = { authorizationStatus: () => 'notDetermined', requestAuthorization: jest.fn(), presentAppPicker: jest.fn() };
  mockNativeGait.mockReturnValue(gait);
  mockCreateClock.mockReturnValue(clock);
  mockCreateDetection.mockReturnValue(detection);
  mockCreateClient.mockReturnValue(client);
  mockCreateWalking.mockReturnValue(walking);
  mockCreateGym.mockReturnValue(gym);
  mockCreateScreenTime.mockReturnValue(screenTime);
  return { gait, clock, detection, client };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockHydrate.mockResolvedValue();
  mockSourceRead.mockReturnValue({ state: 'open', revision: 1 });
  mockHostReconcile.mockResolvedValue('applied');
});

test('hydration completes before any native or client graph construction', async () => {
  let release!: () => void;
  mockHydrate.mockReturnValue(new Promise<void>((resolve) => { release = resolve; }));
  graph();
  const pending = createRealRuntime({ reportError: jest.fn() });
  await Promise.resolve();
  expect(mockNativeGait).not.toHaveBeenCalled();
  expect(mockCreateDetection).not.toHaveBeenCalled();
  expect(mockCreateClient).not.toHaveBeenCalled();
  release();
  const runtime = await pending;
  await runtime.disposeAsync();
});

test('missing native gait rejects instead of falling back to a fake graph', async () => {
  graph({ gait: null });
  await expect(createRealRuntime({ reportError: jest.fn() })).rejects.toThrow('production gait module is missing');
  expect(mockCreateDetection).not.toHaveBeenCalled();
  expect(mockCreateClient).not.toHaveBeenCalled();
});

test('startup failure releases every resource already constructed', async () => {
  const started = graph({ boot: async () => { throw new Error('boot failed'); } });
  await expect(createRealRuntime({ reportError: jest.fn() })).rejects.toThrow('boot failed');
  expect(started.client.dispose).toHaveBeenCalledTimes(1);
  expect(started.detection.stop).toHaveBeenCalledTimes(1);
  expect(started.detection.awake.reconcile).toHaveBeenCalledWith(false);
  expect(started.clock.dispose).toHaveBeenCalled();
  expect((started.gait as { stop: jest.Mock }).stop).toHaveBeenCalled();
});

test('startup cleanup failure reports every failure, finishes cleanup, and requires restart', async () => {
  const started = graph({ boot: async () => { throw new Error('boot failed'); } });
  const clientFailure = new Error('client dispose failed');
  const gaitFailure = new Error('gait stop failed');
  started.client.dispose.mockRejectedValue(clientFailure);
  (started.gait as { stop: jest.Mock }).stop.mockRejectedValue(gaitFailure);
  const reportError = jest.fn();

  const rejection = createRealRuntime({ reportError }).catch((error: unknown) => error);
  const error = await rejection;

  expect(error).toBeInstanceOf(RuntimeCleanupError);
  expect((error as RuntimeCleanupError).failures).toEqual([
    expect.objectContaining({ message: 'boot failed' }),
    clientFailure,
    gaitFailure,
  ]);
  expect(reportError).toHaveBeenCalledWith(clientFailure);
  expect(reportError).toHaveBeenCalledWith(gaitFailure);
  expect(started.detection.stop).toHaveBeenCalledTimes(1);
  expect(started.clock.dispose).toHaveBeenCalledTimes(1);
});

test('explicit disposal rejects when cleanup is incomplete', async () => {
  const started = graph();
  const failure = new Error('detection stop failed');
  started.detection.stop.mockRejectedValue(failure);
  const reportError = jest.fn();
  const runtime = await createRealRuntime({ reportError });

  await expect(runtime.disposeAsync()).rejects.toEqual(
    expect.objectContaining({ name: 'RuntimeCleanupError', failures: [failure] }),
  );
  expect(reportError).toHaveBeenCalledWith(failure);
  expect(started.client.dispose).toHaveBeenCalledTimes(1);
  expect(started.clock.dispose).toHaveBeenCalledTimes(1);
});

test('successful construction returns only the real graph and disposes idempotently', async () => {
  const started = graph();
  const runtime = await createRealRuntime({ reportError: jest.fn() });
  expect(runtime.kind).toBe('real');
  expect((runtime as unknown as { dev?: unknown }).dev).toBeUndefined();
  expect(runtime.walking).toBe(mockCreateWalking.mock.results[0].value);
  expect(runtime.reviewPreset).toBe(started.client.reviewPreset);
  await Promise.all([runtime.disposeAsync(), runtime.disposeAsync()]);
  expect(started.detection.stop).toHaveBeenCalledTimes(1);
  expect(started.client.dispose).toHaveBeenCalledTimes(1);
});

test('the review port asks StoreKit for the system sheet inside the prompt safety window', async () => {
  graph();
  const runtime = await createRealRuntime({ reportError: jest.fn() });
  let pendingDuringCall: boolean | undefined;
  mockStoreReviewRequest.mockImplementationOnce(async () => {
    pendingDuringCall = runtime.safety?.().permissionPromptPending;
  });
  await expect(runtime.review.requestReview()).resolves.toBe('requested');
  expect(mockStoreReviewRequest).toHaveBeenCalledTimes(1);
  expect(pendingDuringCall).toBe(true);
  expect(runtime.safety?.().permissionPromptPending).toBe(false);
  await expect(runtime.review.isAvailable()).resolves.toBe(false);
  await runtime.disposeAsync();
});

test('permission-denied fresh boot skips live motion and explicitly disables step-history query', async () => {
  const started = graph({ authorization: 'denied' });
  const runtime = await createRealRuntime({ reportError: jest.fn() });
  expect(started.detection.start).not.toHaveBeenCalled();
  expect(started.detection.reconcileWake).toHaveBeenCalledTimes(1);
  expect(started.detection.reconcileWake).toHaveBeenCalledWith(expect.objectContaining({ source: 'foreground', includeStepHistory: false }));
  await runtime.disposeAsync();
});

test('raw retention cannot run when calendar seal persistence fails', async () => {
  const barrier = jest.spyOn(historyStore, 'persistBarrier').mockRejectedValueOnce(new Error('seal disk full'));
  const started = graph();
  try {
    await expect(createRealRuntime({ reportError: jest.fn() })).rejects.toThrow('seal disk full');
    expect(started.detection.historyLedger.pruneBeforeDay).not.toHaveBeenCalled();
    expect(started.detection.gymLog.pruneBefore).not.toHaveBeenCalled();
  } finally { barrier.mockRestore(); }
});

test('raw retention follows seals and runs only once for the same calendar cutoff', async () => {
  const now = jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-09-10T12:00:00Z'));
  const barrier = jest.spyOn(historyStore, 'persistBarrier');
  const started = graph();
  const runtime = await createRealRuntime({ reportError: jest.fn() });
  try {
    expect(started.detection.historyLedger.pruneBeforeDay).toHaveBeenCalledWith('2025-08-07');
    expect(started.detection.historyLedger.pruneBeforeDay.mock.invocationCallOrder[0]).toBeGreaterThan(barrier.mock.invocationCallOrder[0]);
    await runtime.reconcile('manual');
    expect(started.detection.historyLedger.pruneBeforeDay).toHaveBeenCalledTimes(1);
  } finally { await runtime.disposeAsync(); barrier.mockRestore(); now.mockRestore(); }
});

test('a crash after sealing cannot lose the final per-rule result on restart', async () => {
  const now = jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-09-10T03:00Z'));
  const rules = rulesStore.getState().data.rules;
  const originalBarrier = ruleDaysStore.persistBarrier;
  let live = { days: [] as import('../../domain/types').RuleDay[], gymPresence: null };
  let disk = JSON.parse(JSON.stringify(live)) as typeof live;
  const getter = jest.spyOn(ruleDaysStore, 'getState').mockImplementation(() => ({
    data: live, patch: (patch) => { live = {...live,...patch} as typeof live; }, reset: jest.fn(),
  }));
  let writes = 0;
  ruleDaysStore.persistBarrier = jest.fn(async () => {
    if (++writes === 2) throw new Error('crash after seal');
    disk = JSON.parse(JSON.stringify(live));
  });
  const configure = () => {
    const started = graph();
    started.detection.walkingDurationLedger.read.mockResolvedValue({
      generation:0, millisecondsByDay:{}, pending:[], segments:[{
        from:Date.parse('2026-09-09T23:40Z'),to:Date.parse('2026-09-10T00:00Z'),day:'2026-09-09',timezone:'UTC',
      }, {
        from:Date.parse('2026-09-10T00:00Z'),to:Date.parse('2026-09-10T00:20Z'),day:'2026-09-10',timezone:'UTC',
      }],
    } as never);
    return started;
  };
  historyStore.getState().reset();
  await historyStore.persistBarrier();
  rules.push({id:'overnight',activity:'walking',mode:{kind:'target',activity:'walking',metric:'minutes',goal:30},schedule:{days:[3],window:{kind:'range',startMinute:1200,endMinute:120}},enabled:true,createdAt:'2026-09-01T00:00Z',updatedAt:''});
  try {
    configure();
    await expect(createRealRuntime({reportError:jest.fn()})).rejects.toThrow('crash after seal');
    expect(historyStore.getState().data.days.find(row=>row.day==='2026-09-09')?.met).toBe(true);
    expect(disk.days.find(row=>row.day==='2026-09-09')?.met).toBe(true);
    live=JSON.parse(JSON.stringify(disk));
    configure();
    const resumed=await createRealRuntime({reportError:jest.fn()});
    expect(disk.days.find(row=>row.day==='2026-09-09')?.met).toBe(true);
    await resumed.disposeAsync();
  } finally {
    rules.splice(0); getter.mockRestore(); ruleDaysStore.persistBarrier=originalBarrier;
    historyStore.getState().reset(); await historyStore.persistBarrier(); now.mockRestore();
  }
});


test('schedule recovery notice clears only after native apply, not a failed repaired plan', async () => {
  graph();
  const issue = { reason: 'nativeWindowLimit', required: 14 };
  mockSourceRead.mockReturnValue({ state: 'unknown', revision: 1, scheduleIssue: issue });
  mockHostReconcile.mockResolvedValue('preserved');
  const runtime = await createRealRuntime({ reportError: jest.fn() });
  expect(runtime.status.snapshot().scheduleIssue).toEqual(issue);
  mockSourceRead.mockReturnValue({ state: 'open', revision: 2 });
  mockHostReconcile.mockRejectedValueOnce(new Error('native apply failed'));
  await expect(runtime.reconcile('manual')).rejects.toThrow('native apply failed');
  expect(runtime.status.snapshot().scheduleIssue).toEqual(issue);
  mockHostReconcile.mockResolvedValueOnce('superseded');
  await runtime.reconcile('manual');
  expect(runtime.status.snapshot().scheduleIssue).toEqual(issue);
  mockHostReconcile.mockResolvedValue('applied');
  await runtime.reconcile('manual');
  expect(runtime.status.snapshot().scheduleIssue).toBeUndefined();
  await runtime.disposeAsync();
});

test('a pocket walk that lifts a shield while backgrounded reports the unlock with its app state', async () => {
  const { client } = graph();
  const shield = { state: 'shield', relief: 'unlockedWalking', revision: 1 };
  mockSourceRead.mockReturnValue(shield);
  const setAppState = (value: string) => Object.defineProperty(AppState, 'currentState', { configurable: true, value });
  const original = Object.getOwnPropertyDescriptor(AppState, 'currentState');
  setAppState('active');
  const runtime = await createRealRuntime({ reportError: jest.fn() });
  expect(client.analytics.track).toHaveBeenCalledWith('shields_applied', { app_state: 'active', source: 'foreground', cause: 'boot' });
  client.analytics.track.mockClear();
  // A tick with nothing new must not re-report the standing shield.
  await runtime.reconcile('manual');
  expect(client.analytics.track).not.toHaveBeenCalled();
  setAppState('background');
  mockSourceRead.mockReturnValue({ ...shield, state: 'conditional', revision: 2 });
  await runtime.reconcile('background');
  expect(client.analytics.track.mock.calls).toEqual([
    ['unlock_completed', { method: 'walking', app_state: 'background', source: 'background' }],
    ['shields_lifted', { app_state: 'background', source: 'background', reason: 'walking' }],
  ]);
  client.analytics.track.mockClear();
  // A policy the host did not apply (superseded/preserved) reports nothing.
  mockSourceRead.mockReturnValue({ ...shield, revision: 3 });
  mockHostReconcile.mockResolvedValueOnce('superseded');
  await runtime.reconcile('background');
  expect(client.analytics.track).not.toHaveBeenCalled();
  await runtime.reconcile('background');
  expect(client.analytics.track.mock.calls).toEqual([
    ['shields_applied', { app_state: 'background', source: 'background', cause: 'relock' }],
  ]);
  if (original) Object.defineProperty(AppState, 'currentState', original);
  await runtime.disposeAsync();
});
