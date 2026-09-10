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
jest.mock('../NativeGait', () => ({ nativeGait: () => mockNativeGait() }));
jest.mock('../../screentime/native/createNativeScreenTimePort', () => ({ createNativeScreenTimePort: (...args: unknown[]) => mockCreateScreenTime(...args) }));
jest.mock('../../../modules/excerlock-enforcement', () => ({ getExcerlockEnforcementModule: () => ({ getPolicyRevision: () => 1 }) }));
jest.mock('../enforcement/native/NativeEnforcementTransport', () => ({ NativeEnforcementTransport: function () { return {}; } }));
jest.mock('../enforcement/RuntimeEnforcementSource', () => ({ RuntimeEnforcementSource: function () { return { read: () => ({ state: 'open' }) }; } }));
const mockHostDispose = jest.fn();
const mockHostReconcile = jest.fn(async () => 'applied');
jest.mock('../enforcement/EnforcementHost', () => ({ EnforcementHost: function () { return { reconcile: mockHostReconcile, dispose: mockHostDispose }; } }));
jest.mock('../detection/headlessRegistry', () => ({ registerHeadlessDetectionHandler: () => mockRegisterHeadless() }));
jest.mock('../../domain/projectStepHistory', () => ({ projectStepHistory: (_rules: unknown, rows: unknown) => rows }));
jest.mock('../../domain/projectGymHistory', () => ({ ...jest.requireActual('../../domain/projectGymHistory'), projectGymHistory: (_rules: unknown, rows: unknown) => rows }));

import { createRealRuntime } from '../createRealRuntime';

const store = (data: object) => ({ persistBarrier: jest.fn(async () => {}), getState: () => ({ data, patch: jest.fn() }), subscribe: jest.fn(() => jest.fn()) });
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
      observeCommitted: jest.fn(() => jest.fn()),
    }, motion: {}, placement: {},
    steps: { authorizationStatus: () => options?.authorization ?? 'denied' },
    awake: { reconcile: jest.fn(async () => ({ requested: false, running: false, error: null })) },
    location: { stopMonitoringRegions: jest.fn(async () => {}) },
    start: jest.fn(async () => {}), stop: jest.fn(async () => {}), registerGyms: jest.fn(async () => {}),
    reconcileWake: jest.fn(async () => {}), walkingDurationLedger: { read: jest.fn(async () => ({ generation: 0, millisecondsByDay: {}, pending: [] })), reset: jest.fn(async () => {}), acknowledge: jest.fn(async () => {}) },
    historyLedger: { read: jest.fn(async () => ({ stepsByDay: {} })) },
    snapshot: () => ({ gym: { intervals: [], regions: {} } }),
  };
  const identity = { kind: 'anonymous', generation: 0 };
  const client = {
    boot: jest.fn(options?.boot ?? (async () => {})), dispose: jest.fn(),
    auth: { identity: () => identity, subscribeIdentity: jest.fn(() => jest.fn()) },
    subscription: { entitlement: () => ({ status: 'unknown' }) }, analytics: {}, notifications: {}, dataExport: {},
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

test('successful construction returns only the real graph and disposes idempotently', async () => {
  const started = graph();
  const runtime = await createRealRuntime({ reportError: jest.fn() });
  expect(runtime.kind).toBe('real');
  expect((runtime as unknown as { dev?: unknown }).dev).toBeUndefined();
  expect(runtime.walking).toBe(mockCreateWalking.mock.results[0].value);
  await Promise.all([runtime.disposeAsync(), runtime.disposeAsync()]);
  expect(started.detection.stop).toHaveBeenCalledTimes(1);
  expect(started.client.dispose).toHaveBeenCalledTimes(1);
});

test('permission-denied fresh boot skips live motion and explicitly disables step-history query', async () => {
  const started = graph({ authorization: 'denied' });
  const runtime = await createRealRuntime({ reportError: jest.fn() });
  expect(started.detection.start).not.toHaveBeenCalled();
  expect(started.detection.reconcileWake).toHaveBeenCalledTimes(1);
  expect(started.detection.reconcileWake).toHaveBeenCalledWith(expect.objectContaining({ source: 'foreground', includeStepHistory: false }));
  await runtime.disposeAsync();
});
