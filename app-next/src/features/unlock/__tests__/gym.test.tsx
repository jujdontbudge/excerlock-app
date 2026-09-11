import { act, render, screen, fireEvent } from '@testing-library/react-native';
import { GymUnlockScreen } from '../GymUnlockScreen';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { createRuntime } from '../../../runtime/createRuntime';
import { ruleDaysStore } from '../../../state/ruleDaysStore';
const mockRouter = { back: jest.fn(), push: jest.fn() };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());
async function mount(preview = false) {
  const runtime = createRuntime();
  await runtime.dev.load('gym-arrival-user');
  runtime.dev.setPromptMode('grant');
  runtime.dev.setPresence('inside');
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <GymUnlockScreen preview={preview} ruleId="gym" />
    </AppRuntimeProvider>,
  );
  return runtime;
}
test('gym confirmation takes 30 seconds and loss of presence resets it', async () => {
  const runtime = await mount();
  await fireEvent.press(screen.getByRole('button', { name: 'Unlock' }));
  await act(() => jest.advanceTimersByTime(15000));
  expect(screen.queryByRole('button', { name: 'Done' })).toBeNull();
  await act(() => runtime.dev.setPresence('outside'));
  expect(screen.getByRole('button', { name: 'Unlock' })).toBeTruthy();
  expect(screen.getByRole('alert')).toHaveTextContent('Location not at gym. Go to a selected gym to unlock.');
  expect(screen.getByLabelText('Presence check').props.accessibilityValue.now).toBe(0);
  runtime.dispose();
});
test('preview completes without checking in or mutating exercise credit', async () => {
  const runtime = await mount(true),
    checkIn = jest.spyOn(runtime.gym, 'checkIn');
  const before = JSON.stringify(ruleDaysStore.getState().data);
  await fireEvent.press(screen.getByRole('button', { name: 'Unlock' }));
  await act(() => jest.advanceTimersByTime(3000));
  await act(() => jest.advanceTimersByTime(1500));
  expect(screen.getByRole('button', { name: 'Done' })).toBeTruthy();
  expect(checkIn).not.toHaveBeenCalled();
  expect(JSON.stringify(ruleDaysStore.getState().data)).toBe(before);
  await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
  expect(mockRouter.back).toHaveBeenCalled();
  runtime.dispose();
});
test('arrival credit is booked only after the full presence confirmation', async () => {
  const runtime = await mount();
  await fireEvent.press(screen.getByRole('button', { name: 'Unlock' }));
  await act(() => jest.advanceTimersByTime(29900));
  expect(ruleDaysStore.getState().data.days.some((d) => d.met)).toBe(false);
  await act(() => jest.advanceTimersByTime(100));
  await act(() => jest.advanceTimersByTime(1500));
  expect(ruleDaysStore.getState().data.days.some((d) => d.met)).toBe(true);
  expect(screen.getByRole('button', { name: 'Done' })).toBeTruthy();
  await act(() => runtime.dispose());
});
test('outside the gym, Unlock re-checks location instead of starting a check-in', async () => {
  const runtime = await mount();
  await act(() => runtime.dev.setPresence('outside'));
  const checkIn = jest.spyOn(runtime.gym, 'checkIn'),
    locate = jest.spyOn(runtime.gym, 'currentLocation');
  expect(screen.queryByRole('header', { name: 'Not at the gym yet' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Unlock' }));
  await act(async () => {
    await Promise.resolve();
  });
  expect(locate).toHaveBeenCalledWith(true);
  expect(checkIn).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toHaveTextContent('Location not at gym. Go to a selected gym to unlock.');
  await act(() => runtime.dev.setPresence('inside'));
  await fireEvent.press(screen.getByRole('button', { name: 'Unlock' }));
  expect(checkIn).toHaveBeenCalled();
  runtime.dispose();
});
