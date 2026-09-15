import { act, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import * as Sharing from 'expo-sharing';
import React from 'react';
import { Alert, AppState, Linking } from 'react-native';

import { rulesStore } from '../../../state/rulesStore';
import { ensureLabWalkingRule, LAB_WALKING_RULE_ID } from '../labWalkingRule.research';
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
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(async () => true), shareAsync: jest.fn(async () => undefined) }));
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
    finalized: jest.fn(),
    exportSession: jest.fn(),
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
  linkedTrace: Record<
    'start' | 'status' | 'preflight' | 'record' | 'stop' | 'finalized' | 'exportSession' | 'deleteSession' | 'abandonExpiredSession',
    jest.Mock
  >;
};

const ready = {
  labStorageIsolated: true,
  screenTimeAuthorized: true,
  motionReady: true,
  canarySelectionValid: true,
  canaryApplicationCount: 1,
  canaryCategoryCount: 0,
  canaryWebDomainCount: 0,
};

const idleStatus = { active: false, sessionId: null, expiresAtWallTimeMs: null, truncated: false };
const activeStatus = { active: true, sessionId: SESSION, expiresAtWallTimeMs: Date.now() + 7_200_000, truncated: false };
const savedSession = { sessionId: SESSION, byteCount: 2_048_000, finalizedAtWallTimeMs: Date.now() };

beforeEach(() => {
  jest.clearAllMocks();
  rulesStore.getState().reset();
  jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  mockParams = {};
  mockEntitlementStatus = 'active';
  mockLinkedTrace.status.mockResolvedValue(idleStatus);
  mockLinkedTrace.preflight.mockResolvedValue(ready);
  mockLinkedTrace.start.mockResolvedValue(activeStatus);
  mockLinkedTrace.stop.mockResolvedValue('file:///tmp/excerlock-linked-trace.ndjson');
  mockLinkedTrace.finalized.mockResolvedValue([]);
  mockLinkedTrace.exportSession.mockResolvedValue('file:///tmp/excerlock-linked-trace.ndjson');
  mockLinkedTrace.deleteSession.mockResolvedValue(undefined);
  mockLinkedTrace.abandonExpiredSession.mockResolvedValue(undefined);
});

test('offers one guided path: instructions, a single Start test, and a single recorder hand-off', async () => {
  const user = userEvent.setup();
  await render(<LinkedTraceScreen />);

  expect(await screen.findByText('How the test works')).toBeTruthy();
  expect(screen.queryByText(/consent/i)).toBeNull();
  expect(screen.getByText(/your canary app opens while you walk/)).toBeTruthy();
  expect(screen.getByText(/blocked again after you stand still past the stop grace/)).toBeTruthy();
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

test('tells the operator which canary to pick instead of claiming a native check can identify it', async () => {
  mockLinkedTrace.preflight.mockResolvedValue({ ...ready, canarySelectionValid: false, canaryCategoryCount: 1 });
  await render(<LinkedTraceScreen />);

  expect(await screen.findByText('Choose one canary app')).toBeTruthy();
  expect(screen.getByText(/never pick Walking Recorder or ExcerLock Trace Lab/i)).toBeTruthy();
  expect(screen.getByText(/iOS does not tell Trace Lab which app you chose/i)).toBeTruthy();
  expect(screen.queryByText('Pick a different canary app')).toBeNull();
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

test('keeps a freshly started test running when Trace Lab comes back to the foreground', async () => {
  const user = userEvent.setup();
  const listeners: ((state: string) => void)[] = [];
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
    listeners.push(listener as (state: string) => void);
    return { remove: jest.fn() } as never;
  });
  await render(<LinkedTraceScreen />);

  await user.press(await screen.findByRole('button', { name: 'Start test' }));
  expect(await screen.findByText('Recording on this phone')).toBeTruthy();

  listeners.forEach((listener) => listener('active'));
  await waitFor(() => expect(mockLinkedTrace.status).toHaveBeenCalled());
  expect(screen.getByText('Recording on this phone')).toBeTruthy();
  expect(screen.queryByText('Test finished — save it')).toBeNull();
});

test('returns to the correct current step when Walking Recorder finishes the test', async () => {
  const user = userEvent.setup();
  mockParams = { sessionId: SESSION, nonce: NONCE, protocolVersion: '1' };
  mockLinkedTrace.status.mockResolvedValue(activeStatus);
  await render(<LinkedTraceScreen />);

  expect(await screen.findByText('Test finished — save it')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Start test' })).toBeNull();

  mockLinkedTrace.finalized.mockResolvedValue([savedSession]);
  mockLinkedTrace.status.mockResolvedValue(idleStatus);
  await user.press(screen.getByRole('button', { name: 'Save trace file' }));
  await waitFor(() => expect(mockLinkedTrace.stop).toHaveBeenCalledWith(SESSION, NONCE));

  expect(await screen.findByText('Saved tests on this phone')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Share trace file' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Share Walking Recorder archive' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Delete this trace from Trace Lab' })).toBeTruthy();
});

test('re-exports a finalized trace after Trace Lab relaunches or its temporary copy is purged', async () => {
  const user = userEvent.setup();
  mockLinkedTrace.finalized.mockResolvedValue([savedSession]);
  await render(<LinkedTraceScreen />);

  expect(await screen.findByText('Saved tests on this phone')).toBeTruthy();
  expect(screen.getByText(/Latest test 123e4567…/)).toBeTruthy();
  await user.press(screen.getByRole('button', { name: 'Share trace file' }));
  await waitFor(() => expect(mockLinkedTrace.exportSession).toHaveBeenCalledWith(SESSION));
  expect(Sharing.shareAsync).toHaveBeenCalledWith('file:///tmp/excerlock-linked-trace.ndjson', { mimeType: 'application/x-ndjson' });

  await user.press(screen.getByRole('button', { name: 'Share Walking Recorder archive' }));
  expect(Linking.openURL).toHaveBeenCalledWith(`excerlock-walkingrecorder://share-archive?sessionId=${SESSION}`);
});

test('confirms before deleting a saved trace and keeps the next test startable', async () => {
  const user = userEvent.setup();
  mockLinkedTrace.finalized.mockResolvedValue([savedSession]);
  await render(<LinkedTraceScreen />);

  await user.press(await screen.findByRole('button', { name: 'Delete this trace from Trace Lab' }));
  expect(Alert.alert).toHaveBeenCalled();
  const calls = (Alert.alert as jest.Mock).mock.calls;
  const buttons = calls[calls.length - 1]?.[2] as { text: string; onPress?: () => void }[];
  mockLinkedTrace.finalized.mockResolvedValue([]);
  await act(async () => { buttons.find((button) => button.text === 'Delete')?.onPress?.(); });
  await waitFor(() => expect(mockLinkedTrace.deleteSession).toHaveBeenCalledWith(SESSION));
  expect(await screen.findByRole('button', { name: 'Start test' })).toBeEnabled();
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

test('tells the truth when a return link points at a test this phone no longer holds', async () => {
  mockParams = { sessionId: SESSION, nonce: NONCE, protocolVersion: '1' };
  await render(<LinkedTraceScreen />);

  expect(await screen.findByText(/nothing to finalize/)).toBeTruthy();
  expect(screen.queryByText(/already saved on this phone/)).toBeNull();
  expect(mockLinkedTrace.start).not.toHaveBeenCalled();
});

test('names a returned link as already saved only when that session is in the saved list', async () => {
  mockParams = { sessionId: SESSION, nonce: NONCE, protocolVersion: '1' };
  mockLinkedTrace.finalized.mockResolvedValue([savedSession]);
  await render(<LinkedTraceScreen />);

  expect(await screen.findByText(/already saved on this phone/)).toBeTruthy();
  expect(mockLinkedTrace.start).not.toHaveBeenCalled();
});

test('installs the isolated walking rule with the trace, before Start begins it', async () => {
  const user = userEvent.setup();
  mockLinkedTrace.start.mockImplementation(async () => {
    expect(rulesStore.getState().data.rules.some((rule) => rule.id === LAB_WALKING_RULE_ID)).toBe(true);
    return activeStatus;
  });
  await render(<LinkedTraceScreen />);

  await user.press(await screen.findByRole('button', { name: 'Start test' }));
  await waitFor(() => expect(mockLinkedTrace.start).toHaveBeenCalledWith(SESSION, NONCE));
  expect(rulesStore.getState().data.rules.some((rule) => rule.id === LAB_WALKING_RULE_ID)).toBe(true);
});

test('removes the isolated walking rule when the test is saved', async () => {
  const user = userEvent.setup();
  mockParams = { sessionId: SESSION, nonce: NONCE, protocolVersion: '1' };
  mockLinkedTrace.status.mockResolvedValue(activeStatus);
  mockLinkedTrace.finalized.mockResolvedValue([savedSession]);
  await render(<LinkedTraceScreen />);
  expect(await screen.findByText('Test finished — save it')).toBeTruthy();
  expect(rulesStore.getState().data.rules.some((rule) => rule.id === LAB_WALKING_RULE_ID)).toBe(true);

  mockLinkedTrace.status.mockResolvedValue(idleStatus);
  await user.press(screen.getByRole('button', { name: 'Save trace file' }));

  await waitFor(() => expect(mockLinkedTrace.stop).toHaveBeenCalledWith(SESSION, NONCE));
  await waitFor(() => expect(rulesStore.getState().data.rules.some((rule) => rule.id === LAB_WALKING_RULE_ID)).toBe(false));
});

test('removes a leftover isolated walking rule as soon as no trace is running', async () => {
  ensureLabWalkingRule();
  expect(rulesStore.getState().data.rules.some((rule) => rule.id === LAB_WALKING_RULE_ID)).toBe(true);

  await render(<LinkedTraceScreen />);

  await waitFor(() => expect(rulesStore.getState().data.rules.some((rule) => rule.id === LAB_WALKING_RULE_ID)).toBe(false));
});

test('resettles an expired review to the expired step when native refuses to finalize', async () => {
  const user = userEvent.setup();
  mockParams = { sessionId: SESSION, nonce: NONCE, protocolVersion: '1' };
  mockLinkedTrace.status.mockResolvedValue(activeStatus);
  await render(<LinkedTraceScreen />);
  expect(await screen.findByText('Test finished — save it')).toBeTruthy();

  mockLinkedTrace.stop.mockRejectedValue(new Error('expired'));
  mockLinkedTrace.status.mockResolvedValue({ ...activeStatus, active: false, expiresAtWallTimeMs: Date.now() - 1 });
  await user.press(screen.getByRole('button', { name: 'Save trace file' }));

  expect(await screen.findByText('This test expired')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Delete expired test' })).toBeTruthy();
  expect(screen.queryByText('The trace could not be saved. Keep Trace Lab installed and try again from this screen.')).toBeNull();
});

test('explains an already-used test link instead of claiming a new trace started', async () => {
  const user = userEvent.setup();
  mockLinkedTrace.start.mockRejectedValue(new Error('UnexpectedException: sessionExists at LinkedTraceWriter.swift:304'));
  await render(<LinkedTraceScreen />);

  await user.press(await screen.findByRole('button', { name: 'Start test' }));
  expect(await screen.findByText(/already used on this phone/)).toBeTruthy();
  expect(screen.queryByText('The trace did not start. Nothing was recorded; try again.')).toBeNull();
  expect(rulesStore.getState().data.rules.some((rule) => rule.id === LAB_WALKING_RULE_ID)).toBe(false);
});
