import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { GymVisit } from '../../../domain/types';
import { GymUnlockScreen } from '../GymUnlockScreen';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { createRuntime, Runtime } from '../../../runtime/createRuntime';
import { ruleDaysStore } from '../../../state/ruleDaysStore';
import { settingsStore } from '../../../state/settingsStore';
import { gymPlace } from '../../../demo/places';
import { startProgressSync } from '../../home/progressSync';

const mockRouter = { back: jest.fn(), push: jest.fn() };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
});

afterEach(() => jest.useRealTimers());

// The screen books no credit of its own: progressSync is the single applier, as in app/(tabs)/_layout.
const syncs: (() => void)[] = [];
afterEach(() => {
  syncs.splice(0).forEach((stop) => stop());
});

async function mount(
  scenario = 'gym-arrival-user',
  configure?: (runtime: Runtime) => void,
  preview = false,
) {
  const runtime = createRuntime();
  await runtime.dev.load(scenario);
  runtime.dev.setPromptMode('grant');
  runtime.dev.setPresence('inside');
  configure?.(runtime);
  syncs.push(startProgressSync(runtime));
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <GymUnlockScreen preview={preview} ruleId="gym" />
    </AppRuntimeProvider>,
  );
  return runtime;
}

test('leaving the radius aborts the in-flight check-in and resets the ring', async () => {
  let signal: AbortSignal | undefined;
  const runtime = await mount('gym-arrival-user', (value) => {
    jest.spyOn(value.gym, 'checkIn').mockImplementation(async (_, confirmation) => {
      signal = confirmation?.signal;
      return new Promise<GymVisit>(() => undefined);
    });
  });
  await fireEvent.press(screen.getByRole('button', { name: 'Unlock' }));
  await act(() => runtime.dev.advance(15_000));
  expect(screen.getByLabelText('Presence check').props.accessibilityValue.now).toBe(50);
  await act(() => runtime.dev.setPresence('outside'));
  expect(signal?.aborted).toBe(true);
  expect(screen.getByLabelText('Presence check').props.accessibilityValue.now).toBe(0);
  expect(ruleDaysStore.getState().data.days.some((day) => day.met)).toBe(false);
  runtime.dispose();
});

test('re-entering the radius after an abort allows a fresh check-in', async () => {
  const runtime = await mount('gym-arrival-user', (value) => {
    jest.spyOn(value.gym, 'checkIn').mockImplementation(() => new Promise<GymVisit>(() => undefined));
  });
  await fireEvent.press(screen.getByRole('button', { name: 'Unlock' }));
  await act(() => runtime.dev.setPresence('outside'));
  await act(() => runtime.dev.setPresence('inside'));
  await fireEvent.press(screen.getByRole('button', { name: 'Unlock' }));
  expect(runtime.gym.checkIn).toHaveBeenCalledTimes(2);
  runtime.dispose();
});

test('no gym saved routes to the gym list instead of showing permission denial', async () => {
  const runtime = await mount('gym-arrival-user', (value) => {
    settingsStore.getState().patch({ gymPlaces: [] });
    value.dev.setPermission('location', 'whenInUse');
  });
  expect(screen.getByRole('header', { name: 'Save a gym first' })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Choose a gym' }));
  expect(mockRouter.push).toHaveBeenCalledWith('/settings/gyms');
  runtime.dispose();
});

test('location denied wins over a saved gym', async () => {
  const runtime = await mount('gym-arrival-user', (value) => {
    value.dev.setPromptMode('deny');
    value.dev.setPermission('location', 'denied');
  });
  expect(screen.getByRole('header', { name: 'Location access is off' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Open Settings' })).toBeTruthy();
  runtime.dispose();
});

test('location granted with a saved gym and no coordinate shows locating', async () => {
  const runtime = await mount('gym-arrival-user', (value) => {
    value.dev.setPermission('location', 'whenInUse');
    jest.spyOn(value.gym, 'currentLocation').mockResolvedValue(null);
    jest.spyOn(value.gym, 'observeLocation').mockImplementation(() => () => undefined);
  });
  expect(screen.getByRole('header', { name: 'Finding your location…' })).toBeTruthy();
  expect(screen.queryByRole('header', { name: 'Location access is off' })).toBeNull();
  runtime.dispose();
});

test('a slow first fix transitions locating to outside without a denied state', async () => {
  let location: ((value: { latitude: number; longitude: number } | null) => void) | undefined;
  const runtime = await mount('gym-arrival-user', (value) => {
    value.dev.setPermission('location', 'whenInUse');
    value.dev.setPresence('outside');
    jest.spyOn(value.gym, 'currentLocation').mockResolvedValue(null);
    jest.spyOn(value.gym, 'observeLocation').mockImplementation((callback) => {
      location = callback;
      return () => undefined;
    });
  });
  expect(screen.getByRole('header', { name: 'Finding your location…' })).toBeTruthy();
  await act(() => location?.({ latitude: gymPlace.latitude + 0.01, longitude: gymPlace.longitude }));
  expect(screen.getByRole('header', { name: 'Not at the gym yet' })).toBeTruthy();
  expect(screen.queryByRole('header', { name: 'Location access is off' })).toBeNull();
  runtime.dispose();
});

test('the confirmation ring and completion advance with the dev clock', async () => {
  const runtime = await mount();
  await fireEvent.press(screen.getByRole('button', { name: 'Unlock' }));
  await act(() => runtime.dev.advance(15_000));
  expect(screen.getByLabelText('Presence check').props.accessibilityValue.now).toBe(50);
  expect(screen.getByLabelText('Lock closed')).toBeTruthy();
  await act(() => runtime.dev.advance(15_000));
  expect(screen.getByLabelText('Lock open')).toBeTruthy();
  runtime.dispose();
});

test('an event arrival books metAt at enteredAt, not the confirmation deadline', async () => {
  const runtime = await mount();
  const enteredAt = runtime.clock.now();
  await fireEvent.press(screen.getByRole('button', { name: 'Unlock' }));
  await act(() => runtime.dev.advance(30_000));
  const row = ruleDaysStore.getState().data.days.find((day) => day.ruleId === 'gym');
  expect(row?.met).toBe(true);
  expect(row?.metAt).toBe(enteredAt);
  runtime.dispose();
});

test("a gym duration rule's shackle lifts at confirmation while the day remains unmet", async () => {
  const runtime = await mount('gym-time-user');
  await fireEvent.press(screen.getByRole('button', { name: 'Unlock' }));
  await act(() => runtime.dev.advance(30_000));
  expect(ruleDaysStore.getState().data.days.find((day) => day.ruleId === 'gym')?.met).toBe(false);
  expect(screen.getByLabelText('Lock open')).toBeTruthy();
  await act(() => jest.advanceTimersByTime(600));
  expect(screen.getByText("Unlocked while you're here. 30 minutes counts the day.")).toBeTruthy();
  runtime.dispose();
});

test('a lapsed ceremony books progress and does not claim an unlock', async () => {
  const runtime = await mount('gym-arrival-user', (value) => value.dev.setEntitlement('expired'));
  await fireEvent.press(screen.getByRole('button', { name: 'Unlock' }));
  await act(() => runtime.dev.advance(30_000));
  await act(() => jest.advanceTimersByTime(600));
  expect(ruleDaysStore.getState().data.days.find((day) => day.ruleId === 'gym')?.met).toBe(true);
  expect(screen.getByRole('header', { name: 'Location detected at the gym' })).toBeTruthy();
  expect(screen.getByText("Your apps aren't blocked right now")).toBeTruthy();
  expect(screen.getByRole('button', { name: 'See plans' })).toBeTruthy();
  runtime.dispose();
});

test('preview completes without checking in or mutating exercise credit', async () => {
  const runtime = await mount('gym-arrival-user', undefined, true);
  const checkIn = jest.spyOn(runtime.gym, 'checkIn');
  const before = JSON.stringify(ruleDaysStore.getState().data);
  await fireEvent.press(screen.getByRole('button', { name: 'Unlock' }));
  await act(() => runtime.dev.advance(3_000));
  await act(() => jest.advanceTimersByTime(1_500));
  expect(screen.getByRole('button', { name: 'Done' })).toBeTruthy();
  expect(checkIn).not.toHaveBeenCalled();
  expect(JSON.stringify(ruleDaysStore.getState().data)).toBe(before);
  runtime.dispose();
});
