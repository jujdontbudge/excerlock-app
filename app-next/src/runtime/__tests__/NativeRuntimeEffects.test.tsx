import { act, render, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';
import type { Runtime } from '../Runtime';

let mockRuntime: Runtime;
let mockStatus = { hydrated: true, loading: false, history: [] };
let mockPathname = '/home';
let mockNavigation: { key: string } | undefined = { key: 'root' };
const mockRouterPush = jest.fn();
const mockMarkSuccessfulLaunch = jest.fn(async () => {});
let mockOtaInput: { getSafety(): Record<string, unknown>; getEnvelope(): unknown } | undefined;
const mockPermission = jest.fn(async (_request: boolean) => 'granted');
const mockClearLastResponse = jest.fn(async () => {});
const mockGetLastResponse = jest.fn(async () => null);
let mockResponseListener: ((response: unknown) => void) | undefined;
const mockResponseRemove = jest.fn();
const mockPermissionSubscribe = jest.fn((_callback: () => void) => jest.fn());
const mockReport = jest.fn();

jest.mock('../AppRuntimeProvider', () => ({ useRuntime: () => mockRuntime }));
jest.mock('../../state/selectors', () => ({ useRuntimeStatus: () => mockStatus }));
jest.mock('expo-router', () => ({
  usePathname: () => mockPathname,
  useRootNavigationState: () => mockNavigation,
  useRouter: () => ({ push: mockRouterPush }),
}));
jest.mock('../updates', () => ({
  useOtaCoordinator: (input: { getSafety(): Record<string, unknown>; getEnvelope(): unknown }) => {
    mockOtaInput = input;
    return { markSuccessfulLaunch: mockMarkSuccessfulLaunch };
  },
  getOtaObservabilityContext: () => ({ update_id: 'update-1' }),
}));
jest.mock('../notifications/ExpoLocalNotifications', () => ({ expoLocalNotifications: { permission: (request: boolean) => mockPermission(request) } }));
jest.mock('../../state/permissionsStore', () => ({ permissionsStore: { subscribe: (callback: () => void) => mockPermissionSubscribe(callback) } }));
jest.mock('../productionRuntime', () => ({ reportRuntimeError: (error: unknown) => mockReport(error) }));
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  clearLastNotificationResponseAsync: () => mockClearLastResponse(),
  getLastNotificationResponseAsync: () => mockGetLastResponse(),
  addNotificationResponseReceivedListener: (callback: (response: unknown) => void) => {
    mockResponseListener = callback;
    return { remove: mockResponseRemove };
  },
}));

import { NativeRuntimeEffects } from '../NativeRuntimeEffects';

function runtime(overrides: Record<string, unknown> = {}) {
  const subscriptionListeners = new Set<() => void>();
  const identityListeners = new Set<() => void>();
  const subscriptionStop = jest.fn();
  const identityStop = jest.fn();
  const state = {
    operation: { busy: false, pending: false, error: null },
    entitlement: { status: 'active', accessExpiresAt: null } as { status: string; accessExpiresAt: string | null },
    identity: { kind: 'canonical', generation: 1 },
    notificationStatus: 'granted',
    walking: {} as Record<string, unknown>,
    safety: undefined as undefined | { permissionPromptPending: boolean; cameraActive: boolean },
  };
  const value = {
    safety: () => state.safety,
    walking: { snapshot: () => state.walking },
    subscription: {
      operation: () => state.operation,
      entitlement: () => state.entitlement,
      subscribe: (callback: () => void) => { subscriptionListeners.add(callback); return subscriptionStop; },
    },
    auth: {
      identity: () => state.identity,
      subscribeIdentity: (callback: () => void) => { identityListeners.add(callback); return identityStop; },
    },
    notifications: {
      status: () => state.notificationStatus,
      scheduleTrialReminder: jest.fn(async () => 'trial_ending'),
      cancel: jest.fn(async () => {}),
    },
    status: {
      flush: jest.fn(async () => {}),
      snapshot: () => mockStatus,
    },
    ...overrides,
  };
  return { value: value as unknown as Runtime, state, subscriptionListeners, identityListeners, subscriptionStop, identityStop };
}

const response = (url: unknown, identifier = 'notification-1') => ({
  actionIdentifier: 'default',
  notification: { date: 100, request: { identifier, content: { data: { url } } } },
});

let mockAppStateListeners: ((state: string) => void)[] = [];

beforeEach(() => {
  jest.clearAllMocks();
  mockAppStateListeners = [];
  mockStatus = { hydrated: true, loading: false, history: [] };
  mockPathname = '/home';
  mockNavigation = { key: 'root' };
  mockResponseListener = undefined;
  mockGetLastResponse.mockResolvedValue(null);
  mockPermission.mockResolvedValue('granted');
  Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'active' });
  jest.spyOn(AppState, 'addEventListener').mockImplementation((((event: string, listener: (state: string) => void) => {
    if (event === 'change') mockAppStateListeners.push(listener);
    return { remove: jest.fn() };
  }) as unknown as typeof AppState.addEventListener));
  jest.spyOn(global, 'requestAnimationFrame').mockImplementation((callback) => { callback(0); return 1; });
  jest.spyOn(global, 'cancelAnimationFrame').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

test('OTA safety reads live busy/camera state and fails closed when walking evidence is missing', async () => {
  const setup = runtime();
  mockRuntime = setup.value;
  await render(<NativeRuntimeEffects />);
  setup.state.operation.busy = true;
  setup.state.safety = { permissionPromptPending: true, cameraActive: true };
  expect(mockOtaInput?.getSafety()).toMatchObject({
    route: '/home', isForeground: true, purchaseOrRestoreBusy: true,
    permissionPromptPending: true, cameraActive: true,
    walkingActive: null, proppedActive: null,
  });
});

test('healthy launch acknowledgement waits for navigation, hydration and runtime flush', async () => {
  let release!: () => void;
  const setup = runtime();
  setup.value.status.flush = jest.fn(() => new Promise<void>((resolve) => { release = resolve; }));
  mockRuntime = setup.value;
  await render(<NativeRuntimeEffects />);
  expect(mockMarkSuccessfulLaunch).not.toHaveBeenCalled();
  await act(async () => release());
  await waitFor(() => expect(mockMarkSuccessfulLaunch).toHaveBeenCalledWith('update-1'));
});

test('unmount makes captured OTA getters fail closed for late async work', async () => {
  const setup = runtime();
  setup.state.walking = { phase: 'inactive', proppedVerified: false };
  mockRuntime = setup.value;
  const view = await render(<NativeRuntimeEffects />);
  expect(mockOtaInput?.getSafety().isForeground).toBe(true);
  expect(mockOtaInput?.getEnvelope()).toEqual({ route: '/home', draftIds: [] });
  await view.unmount();
  expect(mockOtaInput?.getSafety().isForeground).toBe(false);
  expect(mockOtaInput?.getEnvelope()).toBeNull();
});

test('trial reminders follow granted permission, expiry and deleting identity without duplicate work', async () => {
  const setup = runtime();
  setup.state.entitlement = { status: 'trial', accessExpiresAt: new Date(Date.now() + 5 * 86_400_000).toISOString() };
  mockRuntime = setup.value;
  await render(<NativeRuntimeEffects />);
  await waitFor(() => expect(setup.value.notifications.scheduleTrialReminder).toHaveBeenCalledTimes(1));
  setup.state.entitlement = { status: 'expired', accessExpiresAt: null };
  await act(async () => setup.subscriptionListeners.forEach((callback) => callback()));
  expect(setup.value.notifications.cancel).toHaveBeenCalledWith('trial_ending');
  const cancellations = (setup.value.notifications.cancel as jest.Mock).mock.calls.length;
  await act(async () => setup.subscriptionListeners.forEach((callback) => callback()));
  expect(setup.value.notifications.cancel).toHaveBeenCalledTimes(cancellations);
  setup.state.identity = { kind: 'deleting', generation: 2 };
  await act(async () => setup.identityListeners.forEach((callback) => callback()));
  expect(setup.value.notifications.cancel).toHaveBeenCalledTimes(cancellations + 1);
  expect(mockPermission).toHaveBeenCalledWith(false);
});

test('notification routing is allowlisted, deduplicated and listeners clean up', async () => {
  const setup = runtime();
  mockRuntime = setup.value;
  const view = await render(<NativeRuntimeEffects />);
  expect(mockResponseListener).toBeDefined();
  await act(async () => {
    mockResponseListener?.(response('https://attacker.invalid'));
    mockResponseListener?.(response('excerlock://home'));
    mockResponseListener?.(response('excerlock://home'));
  });
  expect(mockRouterPush).toHaveBeenCalledTimes(1);
  expect(mockRouterPush).toHaveBeenCalledWith('/home');
  expect(mockClearLastResponse).toHaveBeenCalledTimes(1);
  await view.unmount();
  expect(mockResponseRemove).toHaveBeenCalledTimes(1);
  expect(mockPermissionSubscribe.mock.results[0].value).toHaveBeenCalledTimes(1);
  expect(setup.subscriptionStop).toHaveBeenCalledTimes(1);
  expect(setup.identityStop).toHaveBeenCalledTimes(1);
  await act(async () => mockResponseListener?.(response('excerlock://paywall', 'late')));
  expect(mockRouterPush).toHaveBeenCalledTimes(1);
});

test('applies remote shield copy on mount and every foreground, never on background', async () => {
  const sync = jest.fn(async () => 'written' as const);
  const setup = runtime({ shieldCopy: { sync } });
  mockRuntime = setup.value;
  await render(<NativeRuntimeEffects />);
  expect(sync).toHaveBeenCalledTimes(1);
  await act(async () => mockAppStateListeners.forEach((listener) => listener('background')));
  expect(sync).toHaveBeenCalledTimes(1);
  await act(async () => mockAppStateListeners.forEach((listener) => listener('active')));
  expect(sync).toHaveBeenCalledTimes(2);
});

test('a missing shield copy port is inert', async () => {
  const setup = runtime();
  mockRuntime = setup.value;
  await render(<NativeRuntimeEffects />);
  await act(async () => mockAppStateListeners.forEach((listener) => listener('active')));
  expect(mockReport).not.toHaveBeenCalled();
});
