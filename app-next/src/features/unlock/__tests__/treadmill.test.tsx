import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { TreadmillUnlockScreen } from '../TreadmillUnlockScreen';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { createRuntime, Runtime } from '../../../runtime/createRuntime';
import { permissionsStore } from '../../../state/permissionsStore';
import { ruleDaysStore } from '../../../state/ruleDaysStore';
import { rulesStore } from '../../../state/rulesStore';
import type { Rule, WalkingSession } from '../../../domain/types';

const mockRouter = { back: jest.fn(), push: jest.fn() };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
});

afterEach(() => jest.useRealTimers());

async function mount(
  scenario = 'unlock-treadmill-scan',
  configure?: (runtime: Runtime) => void,
  props: { ruleId?: string; preview?: boolean } = { ruleId: 'walk' },
) {
  const runtime = createRuntime();
  await runtime.dev.load(scenario);
  configure?.(runtime);
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <TreadmillUnlockScreen {...props} />
    </AppRuntimeProvider>,
  );
  return runtime;
}

async function finishScan() {
  await act(() => jest.advanceTimersByTime(5_000));
}

test('treadmill preview detects the recorded gait without starting a real walking session', async () => {
  const runtime = await mount('home-walking-session', undefined, { preview: true });
  const start = jest.spyOn(runtime.walking, 'start');
  await finishScan();
  await act(() => jest.advanceTimersByTime(1_600));
  expect(screen.getByRole('button', { name: 'Done' })).toBeTruthy();
  expect(start).not.toHaveBeenCalled();
  runtime.dispose();
});

test('framing grace expiry keeps the screen mounted and offers Try again', async () => {
  const runtime = await mount('unlock-treadmill-framing');
  await act(() => jest.advanceTimersByTime(36_000));
  expect(screen.getByRole('header', { name: "We couldn't see you walking" })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Continue with phone in hand' })).toBeTruthy();
  expect(mockRouter.back).not.toHaveBeenCalled();
  runtime.dispose();
});

test('Try again after an expiry restarts the scan and clears the failure heading', async () => {
  const runtime = await mount('unlock-treadmill-framing');
  const start = jest.spyOn(runtime.walking, 'start');
  await act(() => jest.advanceTimersByTime(36_000));
  await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
  expect(start).toHaveBeenCalledTimes(2);
  expect(screen.queryByRole('header', { name: "We couldn't see you walking" })).toBeNull();
  runtime.dispose();
});

test('Continue with phone in hand after an expiry starts a handheld walking session and dismisses', async () => {
  const runtime = await mount('unlock-treadmill-framing');
  const start = jest.spyOn(runtime.walking, 'start');
  await act(() => jest.advanceTimersByTime(36_000));
  await fireEvent.press(screen.getByRole('button', { name: 'Continue with phone in hand' }));
  expect(start).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'walk' }));
  expect(runtime.dev.snapshot().placement).toBe('handheld');
  expect(mockRouter.back).toHaveBeenCalledTimes(1);
  runtime.dispose();
});

test('the shackle does not lift until the session is booked', async () => {
  const runtime = await mount('unlock-treadmill-scan', (value) => {
    jest.spyOn(value.walking, 'completeProppedScan').mockReturnValue(false);
  });
  await finishScan();
  expect(screen.getByLabelText('Lock closed')).toBeTruthy();
  expect(screen.getByRole('alert')).toHaveTextContent("We couldn't start your walk. Close this and try again.");
  runtime.dispose();
});

test("AppState active does not restart the scan when walking.start rejected", async () => {
  let onState: ((state: string) => void) | undefined;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_, callback) => {
    onState = callback as (state: string) => void;
    return { remove: jest.fn() } as never;
  });
  const runtime = await mount('unlock-treadmill-scan', (value) => {
    jest.spyOn(value.walking, 'start').mockRejectedValue(new Error('rejected'));
  });
  const providerStart = jest.spyOn(runtime.gait, 'start');
  await act(() => onState?.('active'));
  expect(providerStart).not.toHaveBeenCalled();
  runtime.dispose();
});

test('closing after a failed booking stops the walking session', async () => {
  const runtime = await mount('unlock-treadmill-scan', (value) => {
    jest.spyOn(value.walking, 'completeProppedScan').mockReturnValue(false);
  });
  const stop = jest.spyOn(runtime.walking, 'stop');
  await finishScan();
  await fireEvent.press(screen.getByRole('button', { name: 'Close unlock screen' }));
  expect(stop).toHaveBeenCalled();
  runtime.dispose();
});

test('a scan that books successfully lifts only with a walking session', async () => {
  const runtime = await mount();
  await finishScan();
  expect(ruleDaysStore.getState().data.walkingSession?.phase).toBe('walking');
  expect(screen.getByLabelText('Lock open')).toBeTruthy();
  runtime.dispose();
});

test.each(['denied', 'restricted'] as const)(
  '%s camera permission offers handheld fallback and never starts the provider',
  async (status) => {
    const runtime = await mount('unlock-treadmill-scan', (value) => {
      jest.spyOn(value.gait, 'permission').mockResolvedValue(status);
      jest.spyOn(value.gait, 'start');
    });
    expect(permissionsStore.getState().data.camera).toBe(status);
    expect(screen.getByRole('header', { name: 'Camera access is off' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continue with phone in hand' })).toBeTruthy();
    expect(runtime.gait.start).not.toHaveBeenCalled();
    runtime.dispose();
  },
);

test('camera permission is recorded before a granted scan starts', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('unlock-treadmill-scan');
  runtime.dev.setPermission('camera', 'notDetermined');
  const permission = jest.spyOn(runtime.gait, 'permission').mockResolvedValue('granted');
  const start = jest.spyOn(runtime.gait, 'start');
  await render(<AppRuntimeProvider runtime={runtime}><TreadmillUnlockScreen ruleId="walk" /></AppRuntimeProvider>);
  expect(screen.getByText('Processed on this iPhone. Nothing is recorded or sent.')).toBeTruthy();
  await act(() => Promise.resolve());
  expect(permission).toHaveBeenCalledTimes(1);
  expect(permissionsStore.getState().data.camera).toBe('granted');
  expect(permission.mock.invocationCallOrder[0]).toBeLessThan(start.mock.invocationCallOrder[0]);
  runtime.dispose();
});

function durationRule(): Rule {
  return {
    id: 'walk-minutes',
    activity: 'walking',
    mode: { kind: 'target', activity: 'walking', metric: 'minutes', goal: 20, place: 'treadmill' },
    schedule: { days: [1, 2, 3, 4, 5], window: { kind: 'range', startMinute: 540, endMinute: 1260 } },
    enabled: true,
    createdAt: '2026-08-01T12:00:00.000Z',
    updatedAt: '2026-09-07T15:00:00.000Z',
  } as unknown as Rule;
}

function installDurationSession(runtime: Runtime) {
  const rule = durationRule();
  rulesStore.getState().patch({ rules: [rule] });
  ruleDaysStore.getState().patch({
    days: [{ ruleId: rule.id, day: '2026-09-07', progress: 0, met: false, metAt: null }],
    walkingSession: null,
  });
  const session: WalkingSession = {
    ruleId: rule.id,
    startedAt: runtime.clock.now(),
    leaseUntil: new Date(Date.parse(runtime.clock.now()) + 900_000).toISOString(),
    phase: 'verifying',
  };
  jest.spyOn(runtime.walking, 'start').mockImplementation(async () => {
    ruleDaysStore.getState().patch({ walkingSession: session });
    return session;
  });
  jest.spyOn(runtime.walking, 'completeProppedScan').mockImplementation(() => {
    ruleDaysStore.getState().patch({ walkingSession: { ...session, phase: 'walking' } });
    return true;
  });
}

test("a duration rule's ring tracks minutes after the scan verifies", async () => {
  const runtime = await mount('unlock-treadmill-scan', installDurationSession, { ruleId: 'walk-minutes' });
  await finishScan();
  await act(() => jest.advanceTimersByTime(1_600));
  await act(() => {
    ruleDaysStore.getState().patch({
      days: [{ ruleId: 'walk-minutes', day: '2026-09-07', progress: 8, met: false, metAt: null }],
    });
  });
  expect(screen.getByRole('header', { name: 'Counting your walk' })).toBeTruthy();
  expect(screen.getByLabelText('Scan progress').props.accessibilityValue.now).toBe(40);
  runtime.dispose();
});

test('the scan does not lift the shackle for a duration rule', async () => {
  const runtime = await mount('unlock-treadmill-scan', installDurationSession, { ruleId: 'walk-minutes' });
  await finishScan();
  await act(() => jest.advanceTimersByTime(600));
  expect(screen.getByLabelText('Lock closed')).toBeTruthy();
  expect(screen.getByRole('header', { name: 'Exercise detected' })).toBeTruthy();
  expect(screen.getByText('20 minutes counts the day')).toBeTruthy();
  runtime.dispose();
});

test('the shackle lifts when a duration goal is reached', async () => {
  const runtime = await mount('unlock-treadmill-scan', installDurationSession, { ruleId: 'walk-minutes' });
  await finishScan();
  await act(() => jest.advanceTimersByTime(1_600));
  await act(() => {
    ruleDaysStore.getState().patch({
      days: [{ ruleId: 'walk-minutes', day: '2026-09-07', progress: 20, met: true, metAt: runtime.clock.now() }],
    });
  });
  expect(screen.getByLabelText('Lock open')).toBeTruthy();
  await act(() => jest.advanceTimersByTime(1_600));
  expect(screen.getByRole('header', { name: 'Goal reached' })).toBeTruthy();
  expect(screen.getByText('Unlocked for the rest of today')).toBeTruthy();
  runtime.dispose();
});

test('a lapsed treadmill ceremony books progress without claiming an unlock', async () => {
  const runtime = await mount('unlock-treadmill-scan', (value) => value.dev.setEntitlement('expired'));
  await finishScan();
  await act(() => jest.advanceTimersByTime(600));
  expect(ruleDaysStore.getState().data.walkingSession?.phase).toBe('walking');
  expect(screen.getByRole('header', { name: 'Exercise detected' })).toBeTruthy();
  expect(screen.getByText("Your apps aren't blocked right now")).toBeTruthy();
  expect(screen.getByRole('button', { name: 'See plans' })).toBeTruthy();
  runtime.dispose();
});
