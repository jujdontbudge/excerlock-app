import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import React from 'react';

import { LinkedTraceScreen } from '../LinkedTraceScreen.research';

const SESSION = '123e4567-e89b-42d3-a456-426614174000';
const NONCE = 'ab'.repeat(32);
let mockParams: Record<string, string> = { sessionId: SESSION, nonce: NONCE, protocolVersion: '1' };
let mockEntitlementStatus = 'active';

jest.mock('expo-router', () => ({ useLocalSearchParams: () => mockParams }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(async () => false), shareAsync: jest.fn() }));
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
jest.mock('../../../runtime/AppRuntimeProvider', () => ({
  useRuntime: () => ({
    screenTime: { requestAuthorization: jest.fn(), presentAppPicker: jest.fn() },
    steps: { request: jest.fn() },
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
  canaryApplicationCount: 1,
  canaryCategoryCount: 0,
  canaryWebDomainCount: 0,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { sessionId: SESSION, nonce: NONCE, protocolVersion: '1' };
  mockEntitlementStatus = 'active';
  mockLinkedTrace.status.mockResolvedValue({ active: false, sessionId: null, expiresAtWallTimeMs: null, truncated: false });
  mockLinkedTrace.preflight.mockResolvedValue(ready);
  mockLinkedTrace.start.mockResolvedValue({ active: true, sessionId: SESSION, expiresAtWallTimeMs: Date.now() + 60_000, truncated: false });
});

test('blocks start and names the first missing real prerequisite', async () => {
  mockLinkedTrace.preflight.mockResolvedValue({ ...ready, labStorageIsolated: false });
  await render(<LinkedTraceScreen />);

  expect(await screen.findByText('Next: Use a signed Trace Lab build with its isolated lab App Group entitlement.')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Start linked trace' })).toBeDisabled();
});

test('blocks an empty run without existing development access', async () => {
  mockEntitlementStatus = 'none';
  await render(<LinkedTraceScreen />);

  expect(await screen.findByText('Next: Sign in to the development environment with existing lab access.')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Start linked trace' })).toBeDisabled();
});

test('starts only after preflight, canary confirmation, and consent', async () => {
  const user = userEvent.setup();
  await render(<LinkedTraceScreen />);

  await screen.findByText('Isolated lab App Group entitlement');
  await user.press(screen.getByRole('checkbox', { name: /My selected app is a harmless canary/ }));
  await user.press(screen.getByRole('checkbox', { name: /I consent to this local research trace/ }));
  await user.press(screen.getByRole('button', { name: 'Start linked trace' }));

  await waitFor(() => expect(mockLinkedTrace.start).toHaveBeenCalledWith(SESSION, NONCE));
  expect(screen.queryByText('Begin lock check')).toBeNull();
  expect(screen.queryByText('Lock check: shield was visible')).toBeNull();
});

test('allows only an explicit nonce-less abandon after expiry', async () => {
  const user = userEvent.setup();
  mockParams = {};
  mockLinkedTrace.status.mockResolvedValue({ active: false, sessionId: SESSION, expiresAtWallTimeMs: Date.now() - 1, truncated: false });
  await render(<LinkedTraceScreen />);

  await screen.findByText('Explicit local cleanup');
  const abandon = screen.getByLabelText('Abandon expired trace');
  expect(abandon).toBeDisabled();
  await user.press(screen.getByRole('checkbox', { name: /I understand this expired trace will be deleted/ }));
  await user.press(abandon);
  await waitFor(() => expect(mockLinkedTrace.abandonExpiredSession).toHaveBeenCalledWith(SESSION));
});
