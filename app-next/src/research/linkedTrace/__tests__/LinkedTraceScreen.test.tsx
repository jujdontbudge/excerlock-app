import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Linking } from 'react-native';

import { LinkedTraceScreen } from '../LinkedTraceScreen.research';

const SESSION = '123e4567-e89b-42d3-a456-426614174000';
const OTHER_SESSION = '9f1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d';
const NONCE = 'ab'.repeat(32);
const mockPush = jest.fn();
let mockParams: Record<string, string> = {};
let mockEntitlementStatus = 'active';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ push: mockPush }),
}));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(async () => true), shareAsync: jest.fn() }));
jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => SESSION),
  getRandomBytes: jest.fn((count: number) => new Uint8Array(count).fill(0xab)),
}));
jest.mock('@linked-trace', () => ({
  linkedTrace: {
    enabled: true,
    start: jest.fn(),
    status: jest.fn(),
    preflight: jest.fn(),
    record: jest.fn(),
    stop: jest.fn(),
    deleteSession: jest.fn(),
    abandonExpiredSession: jest.fn(),
  },
}));
const mockScreenTimeRequest = jest.fn();
const mockAppPicker = jest.fn();
const mockMotionRequest = jest.fn();
jest.mock('../../../runtime/AppRuntimeProvider', () => ({
  useRuntime: () => ({
    screenTime: { requestAuthorization: mockScreenTimeRequest, presentAppPicker: mockAppPicker },
    steps: { request: mockMotionRequest },
  }),
}));
jest.mock('../../../state/entitlementStore', () => ({
  entitlementStore: (selector: (state: unknown) => unknown) => selector({ data: { entitlement: { status: mockEntitlementStatus } } }),
}));

const { linkedTrace: mockLinkedTrace } = jest.requireMock('@linked-trace') as {
  linkedTrace: Record<'start' | 'status' | 'preflight' | 'record' | 'stop' | 'deleteSession' | 'abandonExpiredSession', jest.Mock>;
};

const ready = {
  labStorageIsolated: true,
  screenTimeAuthorized: true,
  motionReady: true,
  canarySelectionValid: true,
  canaryIncludesTestApps: false,
  canaryApplicationCount: 1,
  canaryCategoryCount: 0,
  canaryWebDomainCount: 0,
};

const idleStatus = { active: false, sessionId: null, expiresAtWallTimeMs: null, truncated: false };
const activeStatus = { active: true, sessionId: SESSION, expiresAtWallTimeMs: Date.now() + 7_200_000, truncated: false };

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  mockParams = {};
  mockEntitlementStatus = 'active';
  mockLinkedTrace.status.mockResolvedValue(idleStatus);
  mockLinkedTrace.preflight.mockResolvedValue(ready);
  mockLinkedTrace.start.mockResolvedValue(activeStatus);
  mockLinkedTrace.stop.mockResolvedValue('file:///tmp/excerlock-linked-trace.ndjson');
  mockLinkedTrace.abandonExpiredSession.mockResolvedValue(undefined);
});

test('offers one guided path: instructions, a single Start test, and a single recorder hand-off', async () => {
  const user = userEvent.setup();
  await render(<LinkedTraceScreen />);

  expect(await screen.findByText('How the test works')).toBeTruthy();
  expect(screen.queryByText(/consent/i)).toBeNull();
  const start = screen.getByRole('button', { name: 'Start test' });
  expect(start).toBeEnabled();

  await user.press(start);
  await waitFor(() => expect(mockLinkedTrace.start).toHaveBeenCalledWith(SESSION, NONCE));
  expect(Linking.openURL).toHaveBeenCalledWith(
    `excerlock-walkingrecorder://linked-session?sessionId=${SESSION}&nonce=${NONCE}&protocolVersion=1`,
  );
  expect(await screen.findByText('Recording on this phone')).toBeTruthy();
});

test('names only the missing prerequisite with one action and keeps Start disabled', async () => {
  mockLinkedTrace.preflight.mockResolvedValue({ ...ready, canarySelectionValid: false, canaryApplicationCount: 0 });
  await render(<LinkedTraceScreen />);

  expect(await screen.findByText('Choose one canary app')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Choose canary app' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Start test' })).toBeDisabled();
});

test('refuses a canary that is one of the two test apps instead of asking the operator', async () => {
  mockLinkedTrace.preflight.mockResolvedValue({ ...ready, canarySelectionValid: false, canaryIncludesTestApps: true });
  await render(<LinkedTraceScreen />);

  expect(await screen.findByText('Pick a different canary app')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Start test' })).toBeDisabled();
});

test('asks for Screen Time and motion through the system prompt at the point of need', async () => {
  const user = userEvent.setup();
  mockLinkedTrace.preflight.mockResolvedValue({ ...ready, screenTimeAuthorized: false, motionReady: false });
  mockScreenTimeRequest.mockImplementation(async () => {
    mockLinkedTrace.preflight.mockResolvedValue({ ...ready, motionReady: false });
  });
  await render(<LinkedTraceScreen />);

  await user.press(await screen.findByRole('button', { name: 'Allow Screen Time' }));
  await waitFor(() => expect(mockScreenTimeRequest).toHaveBeenCalled());

  await user.press(await screen.findByRole('button', { name: 'Allow Motion & Fitness' }));
  await waitFor(() => expect(mockMotionRequest).toHaveBeenCalled());
});

test('routes to sign-in once when the phone has no lab access instead of inventing one', async () => {
  const user = userEvent.setup();
  mockEntitlementStatus = 'none';
  await render(<LinkedTraceScreen />);

  expect(await screen.findByText('Sign in once with your lab account')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Start test' })).toBeDisabled();
  await user.press(screen.getByRole('button', { name: 'Sign in' }));
  expect(mockPush).toHaveBeenCalledWith('/sign-in');
});

test('returns to the correct current step when Walking Recorder finishes the test', async () => {
  const user = userEvent.setup();
  mockParams = { sessionId: SESSION, nonce: NONCE, protocolVersion: '1' };
  mockLinkedTrace.status.mockResolvedValue(activeStatus);
  await render(<LinkedTraceScreen />);

  expect(await screen.findByText('Test finished — save it')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Start test' })).toBeNull();
  await user.press(screen.getByRole('button', { name: 'Save trace file' }));
  await waitFor(() => expect(mockLinkedTrace.stop).toHaveBeenCalledWith(SESSION, NONCE));

  mockLinkedTrace.status.mockResolvedValue(idleStatus);
  expect(await screen.findByText('Your two files')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Share Walking Recorder archive' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Share trace file' })).toBeTruthy();
});

test('keeps a running test recoverable while Trace Lab has no link', async () => {
  const user = userEvent.setup();
  mockLinkedTrace.status.mockResolvedValue(activeStatus);
  await render(<LinkedTraceScreen />);

  expect(await screen.findByText('Recording on this phone')).toBeTruthy();
  await user.press(screen.getByRole('button', { name: 'Open Walking Recorder' }));
  expect(Linking.openURL).toHaveBeenCalledWith('excerlock-walkingrecorder://');
});

test('offers only cleanup for an expired trace and returns to Start afterwards', async () => {
  const user = userEvent.setup();
  mockLinkedTrace.status.mockResolvedValue({ active: false, sessionId: OTHER_SESSION, expiresAtWallTimeMs: Date.now() - 1, truncated: false });
  await render(<LinkedTraceScreen />);

  expect(await screen.findByText('This test expired')).toBeTruthy();
  await user.press(screen.getByRole('button', { name: 'Delete expired test' }));
  await waitFor(() => expect(mockLinkedTrace.abandonExpiredSession).toHaveBeenCalledWith(OTHER_SESSION));

  expect(await screen.findByRole('button', { name: 'Start test' })).toBeEnabled();
});

test('treats a stale link as an already saved test instead of starting it again', async () => {
  mockParams = { sessionId: SESSION, nonce: NONCE, protocolVersion: '1' };
  await render(<LinkedTraceScreen />);

  expect(await screen.findByText(/already saved on this phone/)).toBeTruthy();
  expect(mockLinkedTrace.start).not.toHaveBeenCalled();
});

test('explains a finalized session instead of restarting it', async () => {
  const user = userEvent.setup();
  mockLinkedTrace.start.mockRejectedValue(new Error('UnexpectedException: sessionExists at LinkedTraceWriter.swift:304'));
  await render(<LinkedTraceScreen />);

  await user.press(await screen.findByRole('button', { name: 'Start test' }));
  expect(await screen.findByText('The trace did not start. Nothing was recorded; try again.')).toBeTruthy();
});
