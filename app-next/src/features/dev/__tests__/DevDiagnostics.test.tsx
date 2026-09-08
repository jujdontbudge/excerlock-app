import { act, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { createRuntime } from '../../../runtime/createRuntime';
import { DiagnosticsLog } from '../../../diagnostics/DiagnosticsLog';
import { installDiagnosticsLog } from '../../../diagnostics/accessor';
import { syncLog } from '../../../adapters/sync/syncLog';
import { ruleDaysStore } from '../../../state/ruleDaysStore';
import { DevDiagnostics } from '../DevDiagnostics';
import { devCopy as c } from '../../../content/dev';
import { syncCopy } from '../../../content/sync';

jest.mock('../../../motion/haptics', () => ({ feedback: jest.fn(), setHapticsEnabled: jest.fn() }));

jest.mock('../testCrash', () => ({ throwTestCrash: jest.fn() }));
const crash = jest.requireMock('../testCrash').throwTestCrash as jest.Mock;

function memoryStorage() {
  const items = new Map<string, string>();
  return {
    getItem: async (key: string) => items.get(key) ?? null,
    setItem: async (key: string, value: string) => void items.set(key, value),
    removeItem: async (key: string) => void items.delete(key),
  };
}

let restore: (() => void) | undefined;

async function mount() {
  const runtime = createRuntime();
  await runtime.dev.load('home-locked-walking');
  const log = new DiagnosticsLog({ storage: memoryStorage(), now: () => 1_000 });
  restore = installDiagnosticsLog(log);
  const view = await render(
    <AppRuntimeProvider runtime={runtime}>
      <DevDiagnostics />
    </AppRuntimeProvider>,
  );
  return { runtime, log, view };
}

afterEach(() => {
  restore?.();
  restore = undefined;
  crash.mockClear();
  syncLog.getState().clear();
});

test('resetting today clears the rows the day produced', async () => {
  const { runtime, view } = await mount();
  const today = runtime.clock.now().slice(0, 10);
  // A synchronous `act` leaves this version's act environment broken for the *next* test's render.
  await act(async () => {
    ruleDaysStore.getState().patch({
      days: [{ ruleId: 'r1', day: today, progress: 5_000, met: true, metAt: runtime.clock.now() }],
    });
  });

  await userEvent.press(screen.getByText(c.resetToday));

  expect(ruleDaysStore.getState().data.days).toEqual([]);
  view.unmount();
  runtime.dispose();
});

test('pending notifications are listed with the instant each one fires', async () => {
  const { runtime, view } = await mount();
  await act(async () => {
    await runtime.notifications.scheduleTrialReminder('2026-09-12T22:00:00.000Z', 2);
  });

  await userEvent.press(screen.getByText(c.pendingNotifications));

  await waitFor(() => expect(screen.getByText(/2026-09-12T22:00:00.000Z/)).toBeTruthy());
  view.unmount();
  runtime.dispose();
});

test('an empty notification centre says so rather than showing nothing', async () => {
  const { runtime, view } = await mount();

  await userEvent.press(screen.getByText(c.pendingNotifications));

  await waitFor(() => expect(screen.getByText(c.noPending)).toBeTruthy());
  view.unmount();
  runtime.dispose();
});

test('the test crash is recorded before it is thrown, because the throw ends the process', async () => {
  const { runtime, log, view } = await mount();

  await userEvent.press(screen.getByText(c.testCrash));

  await waitFor(() => expect(crash).toHaveBeenCalledTimes(1));
  expect(log.entries().map((entry) => entry.event)).toContain('sentry.testCrash');
  view.unmount();
  runtime.dispose();
});

test('clearing the log empties it', async () => {
  const { runtime, log, view } = await mount();
  log.append('app.state', { state: 'active' });

  await userEvent.press(screen.getByText(c.clearLog));

  await waitFor(() => expect(log.entries()).toEqual([]));
  view.unmount();
  runtime.dispose();
});

test('the sync log shows what the last restore brought back, and what push last succeeded', async () => {
  const { runtime, view } = await mount();
  await act(async () => {
    syncLog.getState().pushed('2026-09-08T10:05:00.000Z');
    syncLog.getState().restored({
      at: '2026-09-08T10:00:00.000Z',
      localWasEmpty: true,
      summary: { rules: 3, removedRules: 0, ruleDays: 4, earnedUnlocks: 1, history: 6, usageDays: 2, profile: true },
    });
    syncLog.getState().log('warn', 'push deferred: offline', '2026-09-08T10:04:00.000Z');
  });

  await waitFor(() => expect(screen.getByText(/push deferred: offline/)).toBeTruthy());
  expect(screen.getByText(/2026-09-08T10:05:00.000Z/)).toBeTruthy();
  view.unmount();
  runtime.dispose();
});

test('a sync log with nothing in it says the app has not synced', async () => {
  const { runtime, view } = await mount();

  expect(screen.getByText(syncCopy.logEmpty)).toBeTruthy();
  view.unmount();
  runtime.dispose();
});
