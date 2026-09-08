import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { GymUnlockScreen } from '../GymUnlockScreen';
import { TreadmillUnlockScreen } from '../TreadmillUnlockScreen';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { createRuntime } from '../../../runtime/createRuntime';
import { assertAccessible } from '../../../testing/assertAccessible';

const mockRouter = { back: jest.fn(), push: jest.fn() };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));

const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
});
afterEach(() => jest.useRealTimers());

async function flush() {
  for (let step = 0; step < 8; step += 1) await act(async () => undefined);
}

const ring = (label: string) => screen.getByLabelText(label).props.accessibilityValue as { min: number; max: number; now: number };

test('the gym ring exposes its progress as an accessibility value and announces detection, then the unlock', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('gym-arrival-user');
  runtime.dev.setPromptMode('grant');
  runtime.dev.setPresence('inside');
  const rendered = await render(
    <AppRuntimeProvider runtime={runtime}>
      <GymUnlockScreen ruleId="gym" />
    </AppRuntimeProvider>,
  );
  expect(screen.getByRole('progressbar', { name: 'Presence check' })).toBeTruthy();
  expect(ring('Presence check')).toEqual({ min: 0, max: 100, now: 0 });
  assertAccessible(rendered.toJSON());
  await fireEvent.press(screen.getByRole('button', { name: 'Unlock' }));
  await act(() => runtime.dev.advance(15_000));
  expect(ring('Presence check').now).toBe(50);
  await act(() => runtime.dev.advance(15_000));
  expect(ring('Presence check').now).toBe(100);
  await act(() => jest.advanceTimersByTime(600));
  expect(announce).toHaveBeenCalledWith('Location detected at the gym');
  await act(() => jest.advanceTimersByTime(1_000));
  expect(announce.mock.calls.map((call) => call[0])).toEqual([
    'Location detected at the gym',
    'Unlocked until 9 PM',
  ]);
  assertAccessible(rendered.toJSON());
  runtime.dispose();
});

test('the treadmill ring exposes its progress and announces "Exercise detected", then the unlock', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('home-walking-session');
  const rendered = await render(
    <AppRuntimeProvider runtime={runtime}>
      <TreadmillUnlockScreen preview />
    </AppRuntimeProvider>,
  );
  await flush();
  expect(screen.getByRole('progressbar', { name: 'Scan progress' })).toBeTruthy();
  expect(ring('Scan progress')).toMatchObject({ min: 0, max: 100 });
  assertAccessible(rendered.toJSON());
  await act(() => jest.advanceTimersByTime(5_000));
  await flush();
  expect(ring('Scan progress').now).toBe(100);
  await act(() => jest.advanceTimersByTime(1_600));
  expect(announce.mock.calls.map((call) => call[0])).toEqual(['Exercise detected', 'Unlocked while you walk']);
  expect(screen.getByRole('button', { name: 'Done' })).toBeTruthy();
  assertAccessible(rendered.toJSON());
  runtime.dispose();
});
