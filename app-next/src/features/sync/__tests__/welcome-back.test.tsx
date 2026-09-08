import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { WelcomeBackGate } from '../WelcomeBackGate';
import { syncLog } from '../../../adapters/sync/syncLog';
import { RestoreSummary } from '../../../domain/syncMerge';

const summary = (over: Partial<RestoreSummary> = {}): RestoreSummary => ({
  rules: 2,
  removedRules: 0,
  ruleDays: 3,
  earnedUnlocks: 0,
  history: 5,
  usageDays: 0,
  profile: true,
  ...over,
});

const restore = async (record: { at?: string; localWasEmpty: boolean; summary?: RestoreSummary }) => {
  await act(async () => {
    syncLog.getState().restored({
      at: record.at ?? '2026-09-08T10:00:00.000Z',
      localWasEmpty: record.localWasEmpty,
      summary: record.summary ?? summary(),
    });
  });
};

beforeEach(() => {
  syncLog.getState().clear();
});

test('shows nothing until a restore has happened', async () => {
  await render(<WelcomeBackGate />);
  expect(screen.queryByText('Welcome back')).toBeNull();
});

test('announces what came back when the device had nothing of its own', async () => {
  await render(<WelcomeBackGate />);
  await restore({ localWasEmpty: true });
  expect(screen.getByText('Welcome back')).toBeTruthy();
  expect(screen.getByText('We restored 2 conditions and 5 days of history from your account.')).toBeTruthy();
});

test('says the app choice did not travel, because it never does', async () => {
  await render(<WelcomeBackGate />);
  await restore({ localWasEmpty: true });
  expect(
    screen.getByText('Pick the apps to lock again — your app choice stays on the device it was made on.'),
  ).toBeTruthy();
});

test('stays out of the way on a device that already had its own rules', async () => {
  await render(<WelcomeBackGate />);
  await restore({ localWasEmpty: false });
  expect(screen.queryByText('Welcome back')).toBeNull();
});

test('stays out of the way when the account had nothing to give back', async () => {
  await render(<WelcomeBackGate />);
  await restore({ localWasEmpty: true, summary: summary({ rules: 0, ruleDays: 0, history: 0, profile: false }) });
  expect(screen.queryByText('Welcome back')).toBeNull();
});

test('is dismissed for good, not until the next store change', async () => {
  await render(<WelcomeBackGate />);
  await restore({ localWasEmpty: true });
  await act(async () => fireEvent.press(screen.getByText('Continue')));
  expect(screen.queryByText('Welcome back')).toBeNull();
  await act(async () => syncLog.getState().pushed('2026-09-08T10:01:00.000Z'));
  expect(screen.queryByText('Welcome back')).toBeNull();
});

test('announces a later restore on its own terms', async () => {
  await render(<WelcomeBackGate />);
  await restore({ localWasEmpty: true });
  await act(async () => fireEvent.press(screen.getByText('Continue')));
  await restore({ at: '2026-09-08T11:00:00.000Z', localWasEmpty: true, summary: summary({ rules: 1, history: 0 }) });
  expect(screen.getByText('We restored 1 condition from your account.')).toBeTruthy();
});
